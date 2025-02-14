from selenium import webdriver
from selenium.webdriver.common.by import By
import os
import sys

num_args=len(sys.argv)-1
post_arg = []

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
save_field = driver.find_element(By.NAME, "action")
save_field.click()