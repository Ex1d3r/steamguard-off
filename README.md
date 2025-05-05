```
  _____  __  __  _____  _____   ______  _____  
 | ____| \ \/ / |_   _||  __ \ |  ____||  __ \ 
 | |__    \  /    | |  | |  | || |__   | |__) |
 |  __|    \/     | |  | |  | ||  __|  |  _  / 
 | |____  /  \   _| |_ | |__| || |____ | | \ \ 
 |______||/\/\| |_____||_____/ |______||_|  \_\
```


Steam-Guard Script

This script automates the process of logging into Steam accounts and disabling Steam Guard using Puppeteer and IMAP email access

Prepare the accs.txt file with the following format:

makefile accs.txt

    steamLogin1:steamPassword1:mailLogin1:mailPassword1
    steamLogin2:steamPassword2:mailLogin2:mailPassword2
    ...

Usage - run the script

The script is intended to be run in a headless mode but can be modified to run in a non-headless mode by changing headless: true to headless: false in the puppeteer.launch method.

License

This script is open-source and available under the MIT License. Feel free to modify and distribute it as needed.
