from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
import os
import sys

num_args=len(sys.argv)-1
post_arg = []

# Set up the WebDriver
driver = webdriver.Chrome()
delay = 3 # seconds

# Navigate to the login page
driver.get("https://izzzzi.net/")

# Locate and fill in the username field
try:
    myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'username')))
    uname_field = driver.find_element(By.NAME, "username")
    uname_field.send_keys(os.environ.get('IZ_UN'))
except TimeoutException:
    print("username field took too much time to load!")

# Locate and fill in the password field
try:
    myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'password')))
    password_field = driver.find_element(By.NAME, "password")
    password_field.send_keys(os.environ.get('IZ_PW'))
except TimeoutException:
    print("password field took too much time to load!")

# Submit the login form
try:
    myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.TAG_NAME, 'button')))
    login_field = driver.find_element(By.TAG_NAME, "button")
    login_field.click()
except TimeoutException:
    print("login button took too much time to load!")

# Navigate to tomorrow
driver.get("https://izzzzi.net/tomorrow")

# Clear existing content
try:
    myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'action')))
    action_fields = driver.find_elements(By.NAME, "action")
    action_fields[1].click()
except TimeoutException:
    print("clear button took too much time to load!")

# Collect user input arguments for post
for arg in range(num_args):
    post_arg.append(sys.argv[arg+1])

# Convert user input arguments into a dictionary
arg_dict = {post_arg[i]: post_arg[i + 1] for i in range(0, len(post_arg), 2)}

# Locate and fill in all relevant post fields
for k,v in arg_dict.items():
    if k == 'text':
        driver.find_element(By.NAME, k).send_keys(v)
    else:
        driver.find_element(By.NAME, k).send_keys(os.path.abspath(v))

# Submit the form
try:
    myElem = WebDriverWait(driver, delay).until(EC.presence_of_element_located((By.NAME, 'action')))
    save_field = driver.find_element(By.NAME, "action")
    save_field.click()
except TimeoutException:
    print("submit button took too much time to load!")