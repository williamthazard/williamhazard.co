from selenium import webdriver
from selenium.webdriver.common.by import By
import os
import sys

num_args=len(sys.argv)-1
post_arg = []

for arg in range(num_args):
    post_arg.append(sys.argv[arg+1])

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

# Locate and fill in the text field
if len(post_arg) > 0:
    text_field = driver.find_element(By.NAME, "text")
    text_field.send_keys(post_arg[0])

# Locate and fill in the image field
if len(post_arg) > 1:
    img_field = driver.find_element(By.NAME, "img")
    img_field.send_keys(os.path.abspath(post_arg[1]))

# Locate and fill in the file field
if len(post_arg) > 2:
    file_field = driver.find_element(By.NAME, "file")
    file_field.send_keys(os.path.abspath(post_arg[2]))

# Submit the form
save_field = driver.find_element(By.NAME, "action")
save_field.click()