from selenium import webdriver
from selenium.webdriver.common.by import By
import os
import sys

num_args=len(sys.argv)-1
post_arg = []
field = []
types = ['text','img','file']

# Set up the WebDriver
driver = webdriver.Chrome()

# Navigate to the login page
driver.get("https://izzzzi.net/")

# Locate and fill in the username field
uname_field = driver.find_element(By.NAME, "username")
uname_field.send_keys(os.environ.get('IZ_UN'))

# Locate and fill in the password field
password_field = driver.find_element(By.NAME, "password")
password_field.send_keys(os.environ.get('IZ_PW'))

# Submit the login form
login_field = driver.find_element(By.TAG_NAME, "button")
login_field.click()

# Navigate to tomorrow
driver.get("https://izzzzi.net/tomorrow")

# Clear existing content
action_fields = driver.find_elements(By.NAME, "action")
action_fields[1].click()

# Locate and fill in data fields
for arg in range(num_args):
    post_arg.append(sys.argv[arg+1])
    field.append(driver.find_element(By.NAME, types[arg]))
    if arg == 0:
        field[arg].send_keys(post_arg[arg])
    else:
        field[arg].send_keys(os.path.abspath(post_arg[arg]))

# Submit the form
save_field = driver.find_element(By.NAME, "action")
save_field.click()