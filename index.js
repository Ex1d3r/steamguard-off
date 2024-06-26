const puppeteer = require('puppeteer');
const fs = require('fs');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

async function loginSteamAndEnterCode(page, steamLogin, steamPassword, mailLogin, mailPassword) {
    try {
        console.log(`Вхожу в аккаунт - логин: ${steamLogin}, пароль: ${steamPassword}`);
        
        // Вход на сайт Steam
        await page.goto('https://store.steampowered.com/login/');
        await page.waitForSelector('._2eKVn6g5Yysx9JmutQe7WV');
        await page.type('._2eKVn6g5Yysx9JmutQe7WV', steamLogin);
        await page.type('input[type="password"]', steamPassword);
        await page.click('button[type="submit"]');
        
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Настройки IMAP
        const config = {
            imap: {
                user: mailLogin.trim(), // Убираем пробелы
                password: mailPassword.trim(), // Убираем пробелы
                host: 'imap.firstmail.ltd', // IMAP-сервер
                port: 993,
                tls: true,
                authTimeout: 3000,
                debug: false // Добавляем логирование
            }
        };

        // Подключаемся к почтовому ящику
        const connection = await imaps.connect(config);

        // Открываем почтовый ящик "INBOX"
        await connection.openBox('INBOX');

        // Настройка поиска писем
        const searchCriteria = [
            'UNSEEN',
            ['FROM', 'noreply@steampowered.com']
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: true
        };

        // Поиск писем
        const results = await connection.search(searchCriteria, fetchOptions);

        // Фильтруем письма по заголовку
        const targetSubject = 'Your Steam account: Access from new web or mobile device';
        const filteredResults = results.filter(result => {
            const headerPart = result.parts.find(part => part.which === 'HEADER');
            const parsedHeader = headerPart && headerPart.body;
            return parsedHeader && parsedHeader['subject'] && parsedHeader['subject'].includes(targetSubject);
        });

        if (filteredResults.length > 0) {
            // Сортируем письма по дате получения в порядке убывания
            filteredResults.sort((a, b) => new Date(b.attributes.date) - new Date(a.attributes.date));
            const latestEmail = filteredResults[0];

            // Получаем текст письма
            const all = latestEmail.parts.filter(part => part.which === 'TEXT')[0].body;

            // Преобразуем тело письма в поток и разбираем его
            const parsed = await simpleParser(all);
            const emailText = parsed.text;


            // Извлекаем код из текста письма
            const regex = /Login Code\s*([A-Z0-9]{5})/;
            const match = emailText.match(regex);
            const code = match ? match[1] : null;

            console.log(`Получил код - ${code}`);

            // Возвращаемся на страницу Steam и вводим код
            await page.bringToFront();
            await page.waitForSelector('#authcode');
            if (code) {
                await page.type('#authcode', code);

                // Ждем авторизации
                await page.waitForNavigation();

                // Переходим на страницу управления двухфакторной аутентификацией
                await page.goto('https://store.steampowered.com/twofactor/manage_action');

                // Выбираем чекпойнт
                await page.waitForSelector('input[type="radio"][name="none_authenticator_check"]');
                await page.click('input[type="radio"][name="none_authenticator_check"]');

                // Дожидаемся загрузки страницы после выбора чекпойнта
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Нажимаем на кнопку "Отключить Steam Guard"
                await page.waitForSelector('a[class="btnv6_green_white_innerfade btn_medium button"]');
                await new Promise(resolve => setTimeout(resolve, 1000));
                await page.click('a[class="btnv6_green_white_innerfade btn_medium button"]');

                console.log('Выбор чекпойнта и нажатие кнопки "Отключить Steam Guard" выполнены');

                // Дожидаемся загрузки страницы после отключения Steam Guard

                await new Promise(resolve => setTimeout(resolve, 10000));

                // После отключения Steam Guard повторно запрашиваем список писем
                    const resultsAfterDisable = await connection.search(searchCriteria, fetchOptions);

                    // Фильтруем письма по заголовку "Disable Steam Guard Confirmation"
                    const targetSubjectAfterDisable = 'Disable Steam Guard Confirmation';
                    const filteredResultsAfterDisable = resultsAfterDisable.filter(result => {
                    const headerPart = result.parts.find(part => part.which === 'HEADER');
                    const parsedHeader = headerPart && headerPart.body;
                        return parsedHeader && parsedHeader['subject'] && parsedHeader['subject'].includes(targetSubjectAfterDisable);
                    });
                if (filteredResultsAfterDisable.length > 0) {
                    // Сортируем письма по дате получения в порядке убывания
                    filteredResultsAfterDisable.sort((a, b) => new Date(b.attributes.date) - new Date(a.attributes.date));
                    const latestEmailAfterDisable = filteredResultsAfterDisable[0];

                    // Получаем текст письма
                    const allAfterDisable = latestEmailAfterDisable.parts.filter(part => part.which === 'TEXT')[0].body;

                    // Преобразуем тело письма в поток и разбираем его
                    const parsedAfterDisable = await simpleParser(allAfterDisable);
                    const emailTextAfterDisable = parsedAfterDisable.text;


                    // Извлекаем ссылку из текста письма
                    const regexLink = /https:\/\/store\.steampowered\.com\/account\/steamguarddisableverification\?stoken=[^\s]+/;
                    const matchLink = emailTextAfterDisable.match(regexLink);
                    const disableLink = matchLink ? matchLink[0] : null;

                    console.log(`Получил ссылку - ${disableLink}`);


                    // Переходим по ссылке для отключения Steam Guard
                    if (disableLink) {
                        await page.goto(disableLink);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        

                        console.log('Переход по ссылке для отключения Steam Guard выполнен');
                    } else {
                        console.log('Не удалось извлечь ссылку из письма');
                    }
                } else {
                    console.log('Письма с заголовком "Disable Steam Guard Confirmation" не найдены.');
                }
            } else {
                console.log('Не удалось получить код из последнего письма.');
            }
        } else {
            console.log('Письма с нужным заголовком от noreply@steampowered.com не найдены.');
        }

        // Закрываем соединение
        connection.end();
    } catch (error) {
        console.error('Error occurred during Steam and email login:', error);
    }
}

(async () => {
    const accounts = fs.readFileSync('accs.txt', 'utf-8').split('\n');
    for (let account of accounts) {
        const [steamLogin, steamPassword, mailLogin, mailPassword] = account.split(':').map(item => item.trim());
        
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        await loginSteamAndEnterCode(page, steamLogin, steamPassword, mailLogin, mailPassword);
        
        // Закрыть текущую страницу и браузер после завершения обработки текущего аккаунта
        await page.close();
        await browser.close();
    }
})();


