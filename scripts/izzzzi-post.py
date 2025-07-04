from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
import keyring
import getpass
import time
import os
import sys

num_args=len(sys.argv)-1
post_arg = []
tomorrow = False
credentials = keyring.get_password('izzzzi-u', 'u')

chrome_options = Options()
chrome_options.add_argument("--headless=new") 

if num_args > 0 and sys.argv[1] == 'update-credentials':
        keyring.delete_password('izzzzi-u','u')
        keyring.delete_password('izzzzi-p','p')
        credentials=None

if credentials is None:
    username = input("izzzzi username: ")
    password = getpass.getpass(prompt='izzzzi password: ')
    keyring.set_password('izzzzi-u','u', username)
    keyring.set_password('izzzzi-p','p', password)
else:
    username = keyring.get_password('izzzzi-u','u')
    password = keyring.get_password('izzzzi-p','p')
    # Set up the WebDriver
    driver = webdriver.Chrome(options=chrome_options)
    delay = 30 # seconds
    # Navigate to the login page
    print('navigating to izzzzi.net')
    driver.get("https://izzzzi.net/")
    # Locate and fill in the username field
    try:
        myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'username')))
        uname_field = driver.find_element(By.NAME, "username")
        uname_field.send_keys(username)
        print('username entered successfully')
    except TimeoutException:
        print("username field took too much time to load!")
    # Locate and fill in the password field
    try:
        myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'password')))
        password_field = driver.find_element(By.NAME, "password")
        password_field.send_keys(password)
        print('password entered successfully')
    except TimeoutException:
        print("password field took too much time to load!")
    # Submit the login form
    try:
        myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.TAG_NAME, 'button')))
        login_field = driver.find_element(By.TAG_NAME, "button")
        login_field.click()
        print('logged in successfully')
        print('navigating to tomorrow page')
        time.sleep(2)
        driver.get("https://izzzzi.net/tomorrow")
        tomorrow = True
    except TimeoutException:
        print("login button took too much time to load!")
    # Clear existing content
    if tomorrow == True:
        action_fields = driver.find_elements(By.NAME, "action")
        action_fields[1].click()
        print('cleared entry successfully')
    # Collect user input arguments for post
    for arg in range(num_args):
        post_arg.append(sys.argv[arg+1])
    # Convert user input arguments into a dictionary
    arg_dict = {post_arg[i]: post_arg[i + 1] for i in range(0, len(post_arg), 2)}
    # Locate and fill in all relevant post fields
    if tomorrow == True:
        time.sleep(2)
        for k,v in arg_dict.items():
            if k == 'text':
                driver.find_element(By.NAME, k).send_keys(v)
                print('text added successfully')
            else:
                driver.find_element(By.NAME, k).send_keys(os.path.abspath(v))
                print('image added successfully')
    # Submit the form
    if tomorrow == True:
        save_field = driver.find_element(By.NAME, "action")
        time.sleep(5)
        save_field.click()
        print('saved new entry successfully')
        time.sleep(5)
        driver.quit()
        print('driver exited successfully')