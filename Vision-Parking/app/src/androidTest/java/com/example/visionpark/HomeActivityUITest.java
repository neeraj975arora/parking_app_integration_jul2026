package com.example.visionpark;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.espresso.Espresso;
import androidx.test.espresso.action.ViewActions;
import androidx.test.espresso.assertion.ViewAssertions;
import androidx.test.espresso.matcher.ViewMatchers;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.GrantPermissionRule;

import com.example.visionpark.activities.HomeActivity;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

/**
 * UI tests for HomeActivity parking discovery functionality
 */
@RunWith(AndroidJUnit4.class)
public class HomeActivityUITest {

    @Rule
    public GrantPermissionRule permissionRule = GrantPermissionRule.grant(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
    );

    @Before
    public void setUp() {
        // Set up shared preferences with mock user data
        Context context = ApplicationProvider.getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("visionpark_prefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("username", "TestUser");
        editor.putString("token", "mock_token");
        editor.apply();
    }

    @Test
    public void testHomeActivityLaunch() {
        // Test that HomeActivity launches successfully
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Verify that the main components are displayed
            onView(withId(R.id.topAppBar)).check(matches(isDisplayed()));
            onView(withId(R.id.search_bar_card)).check(matches(isDisplayed()));
            onView(withId(R.id.mapFragment)).check(matches(isDisplayed()));
            onView(withId(R.id.bottomNavigationView)).check(matches(isDisplayed()));
        }
    }

    @Test
    public void testFloatingActionButtonsAreVisible() {
        // Test that all FAB buttons are visible
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            onView(withId(R.id.fabLocation)).check(matches(isDisplayed()));
            onView(withId(R.id.fabFilter)).check(matches(isDisplayed()));
            onView(withId(R.id.fabQr)).check(matches(isDisplayed())); // This is the toggle button
        }
    }

    @Test
    public void testLocationButtonClick() {
        // Test location button functionality
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Click the location FAB
            onView(withId(R.id.fabLocation)).perform(click());
            
            // Note: In a real test, we would verify that location services are triggered
            // For now, we just verify the button is clickable
        }
    }

    @Test
    public void testFilterButtonOpensDialog() {
        // Test that filter button opens the filter dialog
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Click the filter FAB
            onView(withId(R.id.fabFilter)).perform(click());
            
            // Verify that filter dialog is displayed
            onView(withText("Filter Parking Lots")).check(matches(isDisplayed()));
            onView(withId(R.id.seekBarPrice)).check(matches(isDisplayed()));
            onView(withId(R.id.seekBarDistance)).check(matches(isDisplayed()));
            onView(withId(R.id.cbAvailableOnly)).check(matches(isDisplayed()));
        }
    }

    @Test
    public void testFilterDialogApplyButton() {
        // Test filter dialog apply functionality
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Open filter dialog
            onView(withId(R.id.fabFilter)).perform(click());
            
            // Interact with filter options
            onView(withId(R.id.cbAvailableOnly)).perform(click());
            
            // Apply filters
            onView(withId(R.id.btnApply)).perform(click());
            
            // Verify dialog is dismissed (we can't easily verify the actual filtering without mock data)
        }
    }

    @Test
    public void testFilterDialogResetButton() {
        // Test filter dialog reset functionality
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Open filter dialog
            onView(withId(R.id.fabFilter)).perform(click());
            
            // Change some filter settings
            onView(withId(R.id.cbAvailableOnly)).perform(click());
            onView(withId(R.id.cbCarSlots)).perform(click());
            
            // Reset filters
            onView(withId(R.id.btnReset)).perform(click());
            
            // Verify reset worked (checkboxes should be unchecked)
            onView(withId(R.id.cbAvailableOnly)).check(matches(ViewMatchers.isNotChecked()));
            onView(withId(R.id.cbCarSlots)).check(matches(ViewMatchers.isNotChecked()));
        }
    }

    @Test
    public void testViewToggleButton() {
        // Test view toggle functionality between map and list
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Initially should show map view
            onView(withId(R.id.mapFragment)).check(matches(isDisplayed()));
            onView(withId(R.id.recyclerViewParkingLots)).check(matches(ViewMatchers.withEffectiveVisibility(ViewMatchers.Visibility.GONE)));
            
            // Click toggle button to switch to list view
            onView(withId(R.id.fabQr)).perform(click());
            
            // Verify list view is shown and map is hidden
            onView(withId(R.id.recyclerViewParkingLots)).check(matches(isDisplayed()));
            
            // Click toggle button again to switch back to map view
            onView(withId(R.id.fabQr)).perform(click());
            
            // Verify map view is shown again
            onView(withId(R.id.mapFragment)).check(matches(isDisplayed()));
        }
    }

    @Test
    public void testSearchBarIsInteractable() {
        // Test that search bar is present and interactable
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Verify search bar components are visible
            onView(withId(R.id.search_bar_card)).check(matches(isDisplayed()));
            onView(withId(R.id.autocomplete_fragment)).check(matches(isDisplayed()));
            
            // Note: Testing actual Places API search would require more complex setup
            // This test verifies the UI components are present
        }
    }

    @Test
    public void testBottomNavigationFunctionality() {
        // Test bottom navigation interactions
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Test navigation to sessions
            onView(withId(R.id.nav_sessions)).perform(click());
            
            // Note: In a real test, we would verify navigation occurred
            // For now, we just verify the button is clickable
        }
    }

    @Test
    public void testDrawerNavigationFunctionality() {
        // Test drawer navigation
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Open drawer
            onView(withId(R.id.topAppBar)).perform(click());
            
            // Note: Testing drawer opening would require more complex gesture simulation
            // This test verifies the toolbar is clickable
        }
    }

    @Test
    public void testMapFragmentIsLoaded() {
        // Test that map fragment loads properly
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Verify map fragment is present
            onView(withId(R.id.mapFragment)).check(matches(isDisplayed()));
            
            // Note: Testing actual map interactions would require Google Maps testing utilities
            // This test verifies the fragment container is present
        }
    }

    @Test
    public void testRecyclerViewIsInitialized() {
        // Test that RecyclerView for list view is properly initialized
        try (ActivityScenario<HomeActivity> scenario = ActivityScenario.launch(HomeActivity.class)) {
            // Switch to list view
            onView(withId(R.id.fabQr)).perform(click());
            
            // Verify RecyclerView is displayed
            onView(withId(R.id.recyclerViewParkingLots)).check(matches(isDisplayed()));
            
            // Note: Testing actual list items would require mock data setup
            // This test verifies the RecyclerView container is present and visible
        }
    }
}