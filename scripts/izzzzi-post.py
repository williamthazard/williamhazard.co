from selenium import webdriver
from selenium.webdriver.common.by import By
import os
import sys

post_text = sys.argv[1]
post_image = sys.argv[2]

# Set up the WebDriver
driver = webdriver.Chrome()
driver.minimize_window()

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

# Locate and fill in the form fields
form_field = driver.find_element(By.NAME, "text")
form_field.send_keys(post_text)
img_field = driver.find_element(By.NAME, "img")
img_field.send_keys(os.path.abspath(post_image))
save_field = driver.find_element(By.NAME, "action")

# Submit the form
save_field.click()