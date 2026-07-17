# Guide for Setting Up and Running the Vision-Parking Project

To run this project, you will need Android Studio. The project has been configured to easily switch between a local development server and a remote (EC2) production server.

### 1. Set Up Your Google Maps API Key

The project uses the Google Maps API, and you need to provide your own API key. The project is set up to read the key from a file that is not shared publicly, so you must create it yourself.

1.  Navigate to the root directory of the project.
2.  Create a file named `local.properties`.
3.  Add the following line to this file, replacing `\"YOUR_API_KEY\"` with your actual Google Maps API key:

    ```properties
    MAPS_API_KEY=\"YOUR_API_KEY\"
    ```

Without this key, the map will not display correctly.

### 2. Understanding the Server Setup

The project is designed to connect to two different servers:

*   **Local Server:** `http://10.0.2.2/` (for development)
*   **EC2 Server:** `http://52.66.5.143/` (for testing against the live backend)

You do **not** need to change the URL directly in the code. Instead, you will switch between these server configurations using Android Studio's "Build Variants".

#### Important: What to Do if the EC2 Server IP Changes

If you create a new EC2 instance or the IP address of the server changes, you must update it in **one location**:

1.  Open the `app/build.gradle.kts` file.
2.  Locate the `buildTypes` block and find the `release` section inside it.
3.  Update the IP address in the following line:
    ```kotlin
    // This URL is for your production server (when you build a release APK)
    buildConfigField(\"String\", \"BASE_URL\", \"\\\"http://YOUR_NEW_IP_ADDRESS/\\\"\")
    ```
4.  After saving the file, a banner will appear. Click **"Sync Now"** to apply the changes.

#### Important: EC2 Server Configuration

For the app to be able to communicate with the EC2 server, the server's firewall must be configured to allow incoming traffic on the port your backend is using.

1.  In the **AWS EC2 Console**, find the **Security Group** attached to your instance.
2.  Edit the **Inbound rules**.
3.  Add a rule to allow **HTTP** traffic on port **80**. If your backend runs on a different port (e.g., 8080), add a **Custom TCP** rule for that port.
4.  Set the **Source** to `Anywhere` (`0.0.0.0/0`) for public access.

### 3. How to Switch Between Local and EC2 Servers

1.  In Android Studio, open the **Build Variants** tool window by navigating to **View > Tool Windows > Build Variants**.
2.  In the window that appears, you will see the `app` module. Click on the dropdown menu under the **"Active Build Variant"** column.
3.  Choose your desired server configuration:
    *   Select **`debug`** to connect to your **local server**.
    *   Select **`release`** to connect to the **EC2 server**.

    ![Build Variants Window](https://developer.android.com/static/studio/images/build/build-variants-panel.png)

4.  After you select a variant, Android Studio will quickly sync the project.
5.  Finally, click the **"Run" (▶️)** button to install and run the app with the selected server configuration.


