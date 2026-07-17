# Network Packet Capture Guide -- Tshark (Windows) & tcpdump (Linux)

This comprehensive guide explains how to install network packet capture tools and systematically capture/analyze network traffic between your **React development server (port 5173)** and **mock backend server (port 3001)** for the Parking Admin Dashboard application. This process is essential for debugging API communication issues, analyzing request/response patterns, identifying performance bottlenecks, and ensuring proper data flow between frontend and backend components.

## 📋 Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Windows Installation --
    Wireshark/Tshark](#windows-installation--wiresharktshark)
3.  [Linux Installation -- tcpdump](#linux-installation--tcpdump)
4.  [Starting the Application](#starting-the-application)
5.  [Network Capture Commands](#network-capture-commands)
6.  [Wireshark Analysis](#wireshark-analysis)
7.  [Troubleshooting](#troubleshooting)
8.  [Best Practices](#best-practices)

------------------------------------------------------------------------

## ✅ Prerequisites

Before beginning the network packet capture process, ensure you have the following requirements met:

### System Requirements
-   **Windows 10/11** or **Linux (Ubuntu/Debian/CentOS)** - Compatible operating systems for network packet capture tools
-   **Administrator/root privileges** - Essential for packet capture as network interfaces require elevated permissions to access raw network data
-   **Minimum 4GB RAM** - Recommended for smooth packet capture and analysis operations
-   **At least 1GB free disk space** - For storing capture files and temporary analysis data

### Software Dependencies
-   **Npcap** installed on Windows (WinPcap-compatible mode) - Core packet capture driver that enables low-level network access
-   **Wireshark/Tshark** installed on Windows - Professional network protocol analyzer with command-line interface
-   **tcpdump** installed on Linux - Standard packet capture utility for Unix-like systems
-   **Node.js and npm** - Required for running the application servers

### Application Requirements
-   Parking Admin Dashboard mock server (`3001`) and React dev server (`5173`) running - Both servers must be operational to capture meaningful network traffic
-   **Active network interface** - Ensure your system has a functional network adapter
-   **Firewall configuration** - May need to temporarily disable or configure firewall rules for packet capture

------------------------------------------------------------------------

## 🪟 Windows Installation -- Wireshark/Tshark

### Step 1: Download Wireshark Installer

**Purpose**: Obtain the official Wireshark installation package that includes Tshark command-line tool.

**Process**:
-   Navigate to the official Wireshark website: <https://www.wireshark.org/download.html>
-   Locate the "Windows Installer (64-bit)" section
-   Click the download link to retrieve the latest stable version
-   **File size**: Typically 50-100MB depending on the version
-   **Download location**: Save to your Downloads folder or preferred location

**Important**: Always download from the official website to ensure security and avoid malware.

### Step 2: Run Installer as Administrator

**Purpose**: Install Wireshark with all necessary components and configure Npcap for packet capture functionality.

**Detailed Installation Process**:

1. **Right-click** on the downloaded installer file
2. **Select "Run as administrator"** from the context menu
3. **User Account Control (UAC)** prompt will appear - click "Yes" to proceed
4. **Installation Wizard** will launch - follow these critical selections:

   **Component Selection** (Most Important):
   - ✅ **TShark** - Command-line packet analyzer (essential for our use case)
   - ✅ **Command Line Utilities** - Additional CLI tools for advanced operations
   - ✅ **Wireshark GUI** - Optional but useful for visual analysis
   - ✅ **Npcap** installation (or update if prompted) - Core packet capture driver
   - ✅ **Check "Install Npcap in WinPcap API-compatible Mode"** - Ensures compatibility with older applications
   - ✅ **Optionally tick "Add Wireshark to PATH"** - Allows running tshark from any command prompt location

5. **Installation Progress**: Monitor the installation progress bar
6. **Npcap Installation**: A separate installer will launch for Npcap - follow its prompts
7. **Completion**: Click "Finish" when installation completes

**Expected Duration**: 5-10 minutes depending on system performance

### Step 3: Verify Installation

**Purpose**: Confirm that Tshark is properly installed and can detect network interfaces.

**Verification Process**:
Open Command Prompt as Administrator and run the following commands:

``` bash
tshark -v
tshark -D
```

**Expected Output Analysis**:
- **`tshark -v`**: Should display version information, build details, and compilation date
- **`tshark -D`**: Should list all available network interfaces with their numbers and descriptions

**Success Indicators**:
- Version information displays without errors
- Interface list shows your network adapters (typically interface 7 for loopback on Windows)
- No "command not found" or permission errors

**Troubleshooting**: If commands fail, ensure Wireshark was added to PATH or run from the installation directory.

------------------------------------------------------------------------

## 🐧 Linux Installation -- tcpdump

### Step 1: Update Package Repository and Install tcpdump

**Purpose**: Install the tcpdump packet capture utility and related network analysis tools on Linux systems.

**Installation Process**:

``` bash
sudo apt update && sudo apt install tcpdump wireshark-common
```

**Command Breakdown**:
- **`sudo apt update`**: Updates the package repository index to ensure you get the latest available versions
- **`&&`**: Logical AND operator that executes the second command only if the first succeeds
- **`sudo apt install tcpdump`**: Installs the tcpdump packet capture utility
- **`wireshark-common`**: Installs common Wireshark libraries and utilities (useful for advanced analysis)

**Alternative Package Managers**:
- **CentOS/RHEL/Fedora**: `sudo yum install tcpdump` or `sudo dnf install tcpdump`
- **Arch Linux**: `sudo pacman -S tcpdump`
- **OpenSUSE**: `sudo zypper install tcpdump`

**Expected Output**: Installation progress bars and confirmation messages

### Step 2: Verify Installation

**Purpose**: Confirm that tcpdump is properly installed and can detect network interfaces.

**Verification Commands**:

``` bash
tcpdump --version
tcpdump -D
```

**Expected Output Analysis**:
- **`tcpdump --version`**: Displays version information, compilation details, and supported protocols
- **`tcpdump -D`**: Lists all available network interfaces with their names and descriptions

**Success Indicators**:
- Version information displays without errors
- Interface list shows network adapters (typically `lo` for loopback interface)
- No "command not found" or permission errors

**Additional Verification** (Optional):
``` bash
which tcpdump
man tcpdump
```

**Troubleshooting**: If installation fails, ensure you have sudo privileges and internet connectivity.

------------------------------------------------------------------------

## ▶ Starting the Application

Before capturing network traffic, you must have both the mock server and React development server running simultaneously. This section provides detailed instructions for starting both services.

### Terminal 1 -- Mock Server Setup

**Purpose**: Start the backend mock server that will handle API requests from the React frontend.

**Step-by-Step Process**:

``` bash
cd /path/to/admin_react_app/mock-server
npm run dev
```

**Detailed Instructions**:
1. **Navigate to mock-server directory**: Change to the directory containing the mock server code
2. **Install dependencies** (if not already done): Run `npm install` to ensure all required packages are available
3. **Start development server**: Execute `npm run dev` to launch the mock server in development mode

**Expected Output Analysis**:
```
Mock server running on http://localhost:3001
```

**What This Means**:
- Server is successfully bound to localhost (127.0.0.1) on port 3001
- Mock server is ready to accept HTTP requests
- All API endpoints are now accessible at `http://localhost:3001/api/*`

**Verification Steps**:
- Open browser and navigate to `http://localhost:3001/api/health` (if health endpoint exists)
- Check terminal for any error messages or warnings
- Ensure no port conflicts with other services

### Terminal 2 -- React App Setup

**Purpose**: Start the React development server that will serve the frontend application and make API calls to the mock server.

**Step-by-Step Process**:

``` bash
cd /path/to/admin_react_app
npm run dev
```

**Detailed Instructions**:
1. **Navigate to project root**: Change to the main project directory containing the React application
2. **Install dependencies** (if not already done): Run `npm install` to ensure all required packages are available
3. **Start development server**: Execute `npm run dev` to launch the React development server

**Expected Output Analysis**:
```
Local:   http://localhost:5173/
Network: http://192.168.x.xxx:5173/
```

**What This Means**:
- **Local**: React app accessible on localhost port 5173 (primary development URL)
- **Network**: React app accessible from other devices on your local network
- Development server includes hot-reload functionality for real-time code changes

**Verification Steps**:
- Open browser and navigate to `http://localhost:5173/`
- Verify the Parking Admin Dashboard loads correctly
- Check browser developer tools for any console errors
- Test navigation between different pages/features

**Important Notes**:
- Both servers must be running simultaneously for meaningful packet capture
- Keep both terminal windows open during the capture process
- Monitor both terminals for any error messages or unexpected shutdowns
- The React app will automatically proxy API requests to the mock server if configured correctly

------------------------------------------------------------------------

## 🌐 Network Capture Commands

This section provides the specific commands to capture network traffic between your React application and mock server. The commands are designed to capture all communication on the relevant ports while filtering out unnecessary network noise.

### 🪟 Windows -- Tshark Command

**Purpose**: Capture all network traffic between React dev server (port 5173) and mock server (port 3001) on Windows systems.

**Command**:
``` bash
tshark -i 7 -f "tcp port 5173 or tcp port 3001" -w react_mock_trace.pcapng
```

**Command Parameter Breakdown**:
- **`tshark`**: The command-line version of Wireshark packet analyzer
- **`-i 7`**: Interface number 7 (typically the loopback interface on Windows)
- **`-f "tcp port 5173 or tcp port 3001"`**: Capture filter to only capture TCP traffic on ports 5173 or 3001
- **`-w react_mock_trace.pcapng`**: Write captured packets to a file named `react_mock_trace.pcapng`

**Execution Requirements**:
- **Run as Administrator**: Right-click Command Prompt and select "Run as administrator"
- **Both servers running**: Ensure React (5173) and mock server (3001) are operational
- **Sufficient disk space**: Capture files can grow large during extended sessions

**Expected Behavior**:
- Command will start capturing immediately and continue until manually stopped
- Real-time packet count will be displayed in the terminal
- Press `Ctrl+C` to stop capture and save the file

**File Output**: `react_mock_trace.pcapng` will be created in the current directory

### 🐧 Linux -- tcpdump Command

**Purpose**: Capture all network traffic between React dev server (port 5173) and mock server (port 3001) on Linux systems.

**Command**:
``` bash
sudo tcpdump -i lo -n -s 0 -w react_mock_trace.pcap 'tcp port 5173 or tcp port 3001'
```

**Command Parameter Breakdown**:
- **`sudo`**: Execute with root privileges (required for packet capture)
- **`tcpdump`**: The packet capture utility
- **`-i lo`**: Capture on loopback interface (localhost traffic)
- **`-n`**: Don't resolve hostnames (faster capture, shows IP addresses)
- **`-s 0`**: Capture entire packet (no size limit)
- **`-w react_mock_trace.pcap`**: Write captured packets to file
- **`'tcp port 5173 or tcp port 3001'`**: Capture filter for specific ports

**Execution Requirements**:
- **Root privileges**: Use `sudo` or run as root user
- **Both servers running**: Ensure React (5173) and mock server (3001) are operational
- **Sufficient disk space**: Monitor disk usage during capture

**Expected Behavior**:
- Command will start capturing immediately and continue until manually stopped
- Packet information will be displayed in real-time
- Press `Ctrl+C` to stop capture and save the file

**File Output**: `react_mock_trace.pcap` will be created in the current directory

### Capture Process Workflow

1. **Start both servers** (as described in previous section)
2. **Open third terminal** for packet capture
3. **Execute appropriate capture command** based on your operating system
4. **Perform actions in React app** (navigate pages, submit forms, etc.)
5. **Stop capture** with `Ctrl+C` when sufficient data is collected
6. **Analyze captured file** using Wireshark or other tools

------------------------------------------------------------------------

## 🔍 Wireshark Analysis

After capturing network traffic, the next crucial step is analyzing the captured packets to understand the communication patterns, identify issues, and gain insights into the application's network behavior.

### Step 1: Open Capture File in Wireshark

**Purpose**: Load the captured packet data into Wireshark for detailed analysis and visualization.

**Process**:
1. **Launch Wireshark**: Open the Wireshark application (installed with Tshark)
2. **Open capture file**: Use `File > Open` or drag and drop the capture file
3. **File selection**: Navigate to and select `react_mock_trace.pcapng` (Windows) or `react_mock_trace.pcap` (Linux)

**Expected Result**: Wireshark will display a packet list showing all captured network traffic with timestamps, source/destination addresses, protocols, and packet lengths.

### Step 2: Apply Analysis Filters

**Purpose**: Filter the captured data to focus on specific aspects of the network communication.

**Essential Filters**:

#### Port Filter
```
tcp.port == 5173 || tcp.port == 3001
```
**What this shows**: All TCP traffic involving either port 5173 (React) or port 3001 (mock server)
**Use case**: General overview of all application communication

#### TCP Analysis Flags
```
tcp.analysis.flags
```
**What this shows**: TCP packets with analysis flags (retransmissions, duplicate ACKs, out-of-order packets)
**Use case**: Identifying network performance issues, connection problems, or packet loss

#### HTTP Protocol Filter
```
http
```
**What this shows**: All HTTP requests and responses
**Use case**: Analyzing API calls, request/response patterns, and HTTP-level issues

### Step 3: Advanced Analysis Techniques

**Follow TCP Stream**:
1. Right-click on any packet
2. Select "Follow" > "TCP Stream"
3. View the complete conversation between client and server

**HTTP Analysis**:
1. Filter by `http` protocol
2. Look for HTTP status codes (200, 404, 500, etc.)
3. Examine request methods (GET, POST, PUT, DELETE)
4. Analyze response times and payload sizes

**Performance Analysis**:
1. Use `Statistics` > `Conversations` to see traffic volume
2. Check `Statistics` > `Protocol Hierarchy` for protocol distribution
3. Analyze timing with `Statistics` > `Flow Graph`

### Step 4: Key Metrics to Monitor

**Request/Response Patterns**:
- API endpoint usage frequency
- Request payload sizes
- Response times and status codes
- Error rates and failure patterns

**Network Performance**:
- Packet retransmissions
- Connection establishment time
- Data transfer rates
- Network latency

**Security Analysis**:
- Unencrypted data transmission
- Authentication token handling
- Sensitive data exposure
- Unusual traffic patterns

------------------------------------------------------------------------

## 🛠 Troubleshooting

This section addresses common issues encountered during network packet capture and provides detailed solutions for each problem.

### Common Issues and Solutions

| Issue | Root Cause | Detailed Fix |
|-------|------------|--------------|
| **No packets captured** | Wrong interface or insufficient privileges | **Windows**: Use `tshark -D` to list interfaces, ensure running as Administrator<br/>**Linux**: Use `tcpdump -D` to list interfaces, ensure using `sudo`<br/>**Verification**: Check interface numbers match your system configuration |
| **Permission denied** | Insufficient privileges for packet capture | **Windows**: Right-click Command Prompt → "Run as administrator"<br/>**Linux**: Use `sudo` before tcpdump command<br/>**Alternative**: Add user to wireshark group: `sudo usermod -a -G wireshark $USER` |
| **Large capture files** | Unfiltered capture or extended sessions | **Size limiting**: Add `-s 1500` (limit packet size) or `-C 100` (rotate files at 100MB)<br/>**Filtering**: Use more specific filters to reduce captured data<br/>**Monitoring**: Check disk space before starting capture |
| **React server unreachable** | Server not running or port conflicts | **Verification**: Test with `curl http://localhost:5173` and `curl http://localhost:3001`<br/>**Port check**: Use `netstat -an \| findstr :5173` (Windows) or `netstat -tulpn \| grep :5173` (Linux)<br/>**Process check**: Ensure both servers are running in separate terminals |
| **Interface not found** | Incorrect interface number or name | **Windows**: Run `tshark -D` to see available interfaces (usually interface 7 for loopback)<br/>**Linux**: Run `tcpdump -D` to see interface names (usually `lo` for loopback)<br/>**Alternative**: Use interface name instead of number |
| **Capture stops unexpectedly** | System resource limits or errors | **Memory**: Check available RAM and close unnecessary applications<br/>**Disk space**: Ensure sufficient free space for capture files<br/>**Process limits**: Check system limits for file descriptors |

### Advanced Troubleshooting

**Network Interface Detection**:
```bash
# Windows
tshark -D
netsh interface show interface

# Linux
tcpdump -D
ip link show
```

**Server Connectivity Testing**:
```bash
# Test React server
curl -v http://localhost:5173

# Test mock server
curl -v http://localhost:3001/api/health

# Check if ports are listening
netstat -an | findstr :5173  # Windows
netstat -tulpn | grep :5173  # Linux
```

**Capture File Analysis**:
```bash
# Check file size and basic info
ls -la react_mock_trace.pcap*

# Verify file integrity
tshark -r react_mock_trace.pcapng -c 10  # Show first 10 packets
```

**Performance Optimization**:
- Use specific filters to reduce capture volume
- Limit capture duration with `-a duration:300` (5 minutes)
- Rotate files with `-C 50` (50MB per file)
- Monitor system resources during capture

------------------------------------------------------------------------

## 📌 Best Practices

This section outlines essential best practices for effective and secure network packet capture, ensuring optimal results while maintaining system performance and data security.

### Capture Efficiency

**Port-Specific Filtering**:
- Capture **only required ports** to reduce noise and improve performance
- Use specific filters: `tcp port 5173 or tcp port 3001` instead of capturing all traffic
- Avoid broad filters that capture unnecessary network traffic

**Resource Management**:
- Monitor disk space before starting captures (files can grow large quickly)
- Use capture duration limits: `-a duration:300` for 5-minute captures
- Implement file rotation: `-C 50` to create new files every 50MB

### Capture Control

**Proper Termination**:
- Always **stop captures** with `Ctrl+C` to ensure proper file closure
- Use duration limits: `-a duration:SECONDS` for automated stopping
- Avoid force-closing terminals during active captures

**File Management**:
- Save important `.pcap` files for later analysis and documentation
- Use descriptive filenames that include timestamps and purpose
- Organize capture files in dedicated directories

### Timestamped Filenames

**Purpose**: Create unique, identifiable capture files for better organization and tracking.

**Command Example**:
``` bash
tshark -i 7 -f "tcp port 5173 or tcp port 3001" -w react_mock_$(date +%Y%m%d_%H%M%S).pcapng
```

**Filename Benefits**:
- **Unique identification**: Prevents file overwrites
- **Chronological organization**: Easy to sort and find specific captures
- **Session tracking**: Multiple captures can be easily distinguished
- **Audit trail**: Clear record of when captures were performed

### Security Considerations

**Data Protection**:
- Keep sensitive data secure - filters can prevent capturing passwords and tokens
- Use display filters in Wireshark to hide sensitive information during analysis
- Consider data retention policies for capture files containing sensitive information

**Access Control**:
- Restrict access to capture files containing sensitive data
- Use appropriate file permissions on capture directories
- Consider encryption for long-term storage of sensitive captures

### Performance Optimization

**System Resources**:
- Close unnecessary applications during capture to free up system resources
- Monitor CPU and memory usage during extended capture sessions
- Use SSD storage for better capture performance

**Network Impact**:
- Capture during low-usage periods to minimize impact on application performance
- Consider network bandwidth limitations when capturing on production systems
- Test capture impact on application functionality

### Documentation and Analysis

**Capture Documentation**:
- Document the purpose and scope of each capture session
- Record any issues or anomalies observed during capture
- Maintain logs of capture parameters and filters used

**Analysis Workflow**:
- Establish consistent analysis procedures for captured data
- Use standardized filters and views for common analysis tasks
- Document findings and recommendations from packet analysis
