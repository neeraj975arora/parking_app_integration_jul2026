from appium.webdriver.common.appiumby import AppiumBy
from tests.common import wait_for_element, assert_element_is_visible, is_element_visible
from tests.auth_helpers import login
from tests.constants import REGISTER_EMAIL, REGISTER_PASSWORD, REGISTER_NAME
import time
import pytest

def test_burger_menu_opens_and_closes(driver):
    """
    Tests that the side navigation drawer (burger menu) opens and closes correctly.
    Steps:
    1. Log in to get to the home screen.
    2. Tap the burger menu icon to open the navigation drawer.
    3. Verify the drawer is open by checking for the user's name.
    4. Close the drawer using the system back button.
    5. Verify the drawer is closed.
    """
    # 1. Log in to get to the home screen
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()
    login(driver, REGISTER_EMAIL, REGISTER_PASSWORD)
    time.sleep(2) # Allow home screen to settle

    # 2. Tap the burger menu icon to open the drawer
    burger_menu_locator = (AppiumBy.ACCESSIBILITY_ID, "Open navigation drawer")
    wait_for_element(driver, burger_menu_locator).click()
    time.sleep(1) # Allow for slide-in animation

    # 3. Verify the drawer is open by looking for the user's username
    drawer_username_locator = (AppiumBy.XPATH, f"//*[contains(@text, '{REGISTER_NAME}')]")
    assert_element_is_visible(driver, drawer_username_locator)

    # 4. Close the drawer by pressing the system back button.
    # This is the most reliable way to close a navigation drawer.
    driver.back()
    time.sleep(1) # Allow for slide-out animation

    # 5. Verify the drawer is closed by asserting that the username is no longer visible.
    if is_element_visible(driver, drawer_username_locator):
        pytest.fail("The navigation drawer did not close correctly.")
