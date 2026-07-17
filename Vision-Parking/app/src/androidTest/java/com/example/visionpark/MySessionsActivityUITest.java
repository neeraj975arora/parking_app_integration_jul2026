package com.example.visionpark;

import android.content.Context;
import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.espresso.contrib.RecyclerViewActions;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import com.example.visionpark.activities.MySessionsActivity;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.swipeDown;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.hasDescendant;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.hamcrest.Matchers.not;

/**
 * UI tests for MySessionsActivity
 * Tests session display, real-time updates, and checkout workflow
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class MySessionsActivityUITest {
    
    private ActivityScenario<MySessionsActivity> activityScenario;
    
    @Before
    public void setUp() {
        // Create intent with mock session data
        Context context = ApplicationProvider.getApplicationContext();
        Intent intent = new Intent(context, MySessionsActivity.class);
        
        // Launch activity
        activityScenario = ActivityScenario.launch(intent);
        
        // Wait for activity to load
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    
    @After
    public void tearDown() {
        if (activityScenario != null) {
            activityScenario.close();
        }
    }
    
    @Test
    public void testActivityLaunch() {
        // Verify that the activity launches successfully
        onView(withId(R.id.recyclerViewSessions)).check(matches(isDisplayed()));
    }
    
    @Test
    public void testSessionSummaryDisplay() {
        // Verify that session summary is displayed
        onView(withId(R.id.tvSessionSummary)).check(matches(isDisplayed()));
        onView(withId(R.id.tvSessionSummary)).check(matches(withText("1 active session • 2 total")));
    }
    
    @Test
    public void testActiveSessionDisplay() {
        // Verify that active sessions are displayed correctly
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("ACTIVE"))));
        
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Central Plaza Parking"))));
        
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Vehicle (ABC-123)"))));
        
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Floor 2, Row A, Slot 15"))));
    }
    
    @Test
    public void testCompletedSessionDisplay() {
        // Verify that completed sessions are displayed correctly
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("COMPLETED"))));
        
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Mall Parking"))));
        
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Completed"))));
    }
    
    @Test
    public void testExitVehicleButtonVisibility() {
        // Verify that Exit Vehicle button is visible for active sessions
        // and hidden for completed sessions
        
        // For active session, Exit Vehicle button should be visible
        onView(withId(R.id.recyclerViewSessions))
            .perform(RecyclerViewActions.actionOnItemAtPosition(0, click()));
        
        // Check if the first item (active session) has Exit Vehicle button
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("Exit Vehicle"))));
    }
    
    @Test
    public void testSwipeToRefresh() {
        // Test swipe to refresh functionality
        onView(withId(R.id.swipeRefreshLayout))
            .perform(swipeDown());
        
        // Wait for refresh to complete
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Verify that sessions are still displayed after refresh
        onView(withId(R.id.recyclerViewSessions)).check(matches(isDisplayed()));
    }
    
    @Test
    public void testExitVehicleDialog() {
        // Test that clicking Exit Vehicle shows confirmation dialog
        
        // Click on the first session (active session)
        onView(withId(R.id.recyclerViewSessions))
            .perform(RecyclerViewActions.actionOnItemAtPosition(0, 
                RecyclerViewActions.actionOnItem(hasDescendant(withText("Exit Vehicle")), click())));
        
        // Wait for dialog to appear
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Verify that confirmation dialog is displayed
        onView(withText("Exit Vehicle")).check(matches(isDisplayed()));
        onView(withText("Are you sure you want to exit your vehicle?")).check(matches(isDisplayed()));
        onView(withText("Exit & Pay")).check(matches(isDisplayed()));
        onView(withText("Cancel")).check(matches(isDisplayed()));
    }
    
    @Test
    public void testCheckoutWorkflow() {
        // Test the complete checkout workflow
        
        // Click Exit Vehicle button on active session
        onView(withId(R.id.recyclerViewSessions))
            .perform(RecyclerViewActions.actionOnItemAtPosition(0, 
                RecyclerViewActions.actionOnItem(hasDescendant(withText("Exit Vehicle")), click())));
        
        // Wait for dialog
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Click "Exit & Pay" button
        onView(withText("Exit & Pay")).perform(click());
        
        // Wait for checkout process
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Verify that session status changed to completed
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("COMPLETED"))));
    }
    
    @Test
    public void testEmptyStateVisibility() {
        // This test would require mocking empty session data
        // For now, we verify that the empty state layout exists
        onView(withId(R.id.layoutEmptyState)).check(matches(not(isDisplayed())));
    }
    
    @Test
    public void testLoadingStateVisibility() {
        // Verify that loading state is not visible after data loads
        onView(withId(R.id.layoutLoading)).check(matches(not(isDisplayed())));
    }
    
    @Test
    public void testSessionCardInteraction() {
        // Test clicking on session card shows details
        onView(withId(R.id.recyclerViewSessions))
            .perform(RecyclerViewActions.actionOnItemAtPosition(0, click()));
        
        // Wait for any potential navigation or dialog
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // For now, this just shows a toast, so we verify the activity is still visible
        onView(withId(R.id.recyclerViewSessions)).check(matches(isDisplayed()));
    }
    
    @Test
    public void testBottomNavigationInteraction() {
        // Test bottom navigation functionality
        onView(withId(R.id.bottomNavigationView)).check(matches(isDisplayed()));
        
        // Test navigation to Home
        onView(withId(R.id.nav_home)).perform(click());
        
        // Wait for navigation
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Activity should finish and navigate to Home
        // This test verifies the navigation doesn't crash
    }
    
    @Test
    public void testRealTimeUpdates() {
        // Test that session duration updates in real-time
        // This is a simplified test - in a real scenario, we'd mock the service
        
        // Verify initial state
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("ACTIVE"))));
        
        // Wait for potential real-time updates
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Verify session is still active (duration might have updated)
        onView(withId(R.id.recyclerViewSessions))
            .check(matches(hasDescendant(withText("ACTIVE"))));
    }
}