package com.example.visionpark;

import androidx.fragment.app.testing.FragmentScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.example.visionpark.fragments.FilterDialogFragment;

import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isChecked;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.isNotChecked;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

/**
 * UI tests for FilterDialogFragment
 */
@RunWith(AndroidJUnit4.class)
public class FilterDialogFragmentUITest {

    @Test
    public void testFilterDialogDisplaysAllComponents() {
        // Test that all filter components are displayed
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Verify all UI components are displayed
        onView(withId(R.id.seekBarPrice)).check(matches(isDisplayed()));
        onView(withId(R.id.seekBarDistance)).check(matches(isDisplayed()));
        onView(withId(R.id.tvPriceValue)).check(matches(isDisplayed()));
        onView(withId(R.id.tvDistanceValue)).check(matches(isDisplayed()));
        onView(withId(R.id.cbAvailableOnly)).check(matches(isDisplayed()));
        onView(withId(R.id.cbCarSlots)).check(matches(isDisplayed()));
        onView(withId(R.id.cbTwoWheelerSlots)).check(matches(isDisplayed()));
        onView(withId(R.id.btnApply)).check(matches(isDisplayed()));
        onView(withId(R.id.btnReset)).check(matches(isDisplayed()));
    }

    @Test
    public void testDefaultFilterValues() {
        // Test that default filter values are set correctly
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Verify default text values
        onView(withId(R.id.tvPriceValue)).check(matches(withText("₹100/hr")));
        onView(withId(R.id.tvDistanceValue)).check(matches(withText("10.0 km")));
        
        // Verify checkboxes are unchecked by default
        onView(withId(R.id.cbAvailableOnly)).check(matches(isNotChecked()));
        onView(withId(R.id.cbCarSlots)).check(matches(isNotChecked()));
        onView(withId(R.id.cbTwoWheelerSlots)).check(matches(isNotChecked()));
    }

    @Test
    public void testCheckboxInteractions() {
        // Test checkbox interactions
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Click checkboxes and verify they are checked
        onView(withId(R.id.cbAvailableOnly)).perform(click());
        onView(withId(R.id.cbAvailableOnly)).check(matches(isChecked()));
        
        onView(withId(R.id.cbCarSlots)).perform(click());
        onView(withId(R.id.cbCarSlots)).check(matches(isChecked()));
        
        onView(withId(R.id.cbTwoWheelerSlots)).perform(click());
        onView(withId(R.id.cbTwoWheelerSlots)).check(matches(isChecked()));
        
        // Click again to uncheck
        onView(withId(R.id.cbAvailableOnly)).perform(click());
        onView(withId(R.id.cbAvailableOnly)).check(matches(isNotChecked()));
    }

    @Test
    public void testResetButtonFunctionality() {
        // Test reset button functionality
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Change some filter settings
        onView(withId(R.id.cbAvailableOnly)).perform(click());
        onView(withId(R.id.cbCarSlots)).perform(click());
        onView(withId(R.id.cbTwoWheelerSlots)).perform(click());
        
        // Verify they are checked
        onView(withId(R.id.cbAvailableOnly)).check(matches(isChecked()));
        onView(withId(R.id.cbCarSlots)).check(matches(isChecked()));
        onView(withId(R.id.cbTwoWheelerSlots)).check(matches(isChecked()));
        
        // Click reset button
        onView(withId(R.id.btnReset)).perform(click());
        
        // Verify all checkboxes are unchecked
        onView(withId(R.id.cbAvailableOnly)).check(matches(isNotChecked()));
        onView(withId(R.id.cbCarSlots)).check(matches(isNotChecked()));
        onView(withId(R.id.cbTwoWheelerSlots)).check(matches(isNotChecked()));
        
        // Verify default values are restored
        onView(withId(R.id.tvPriceValue)).check(matches(withText("₹100/hr")));
        onView(withId(R.id.tvDistanceValue)).check(matches(withText("10.0 km")));
    }

    @Test
    public void testApplyButtonIsClickable() {
        // Test that apply button is clickable
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Set some filter options
        onView(withId(R.id.cbAvailableOnly)).perform(click());
        
        // Click apply button (this would normally dismiss the dialog and apply filters)
        onView(withId(R.id.btnApply)).perform(click());
        
        // Note: In a real test with a parent activity, we would verify that the filter listener is called
        // For this isolated fragment test, we just verify the button is clickable
    }

    @Test
    public void testFilterLabelsAreDisplayed() {
        // Test that all filter section labels are displayed
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Verify section labels
        onView(withText("Maximum Price")).check(matches(isDisplayed()));
        onView(withText("Maximum Distance")).check(matches(isDisplayed()));
        onView(withText("Availability Options")).check(matches(isDisplayed()));
        onView(withText("Vehicle Type")).check(matches(isDisplayed()));
        
        // Verify checkbox labels
        onView(withText("Show only available parking lots")).check(matches(isDisplayed()));
        onView(withText("Car parking available")).check(matches(isDisplayed()));
        onView(withText("Two-wheeler parking available")).check(matches(isDisplayed()));
        
        // Verify button labels
        onView(withText("Reset")).check(matches(isDisplayed()));
        onView(withText("Apply Filters")).check(matches(isDisplayed()));
    }

    @Test
    public void testSeekBarsAreInteractable() {
        // Test that seek bars are present and interactable
        FragmentScenario<FilterDialogFragment> scenario = FragmentScenario.launchInContainer(FilterDialogFragment.class);
        
        // Verify seek bars are displayed
        onView(withId(R.id.seekBarPrice)).check(matches(isDisplayed()));
        onView(withId(R.id.seekBarDistance)).check(matches(isDisplayed()));
        
        // Note: Testing actual seek bar interactions would require more complex gesture simulation
        // This test verifies the seek bars are present and visible
    }
}