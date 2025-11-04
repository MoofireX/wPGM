# wPGM Waypoint Editor

A simple web-based application to visualize PGM maps and edit waypoint data.

## Installation

This application is designed to be installed as a Python package. 

### Prerequisites

- Python 3.7+ and `pip` must be installed on your system.

### Steps

1.  **Navigate to the Package Directory:**
    Open your terminal or command prompt and navigate to this `wDist` directory.

2.  **Install the Package:**
    Run the following command to install the application and its dependencies. The `.` refers to the current directory.

    ```bash
    pip install .
    ```

    For developers who want to edit the source code, you can install it in editable mode:

    ```bash
    pip install -e .
    ```

## How to Run

After the installation is complete, a new command called `wpgm-editor` will be available in your system.

1.  **Run the Server:**
    In your terminal, simply run the command:

    ```bash
    wpgm-editor
    ```

2.  **Open the Application:**
    The terminal will show a message indicating that the server is running. Open your web browser and navigate to the following address:

    [http://127.0.0.1:5000](http://127.0.0.1:5000)

## How to Use

1.  **Load Data:** Use the form on the web page to upload your PGM map file, the corresponding YAML configuration file, and a CSV file containing the original waypoints.
2.  **View:** The application will display the map with the original waypoints plotted in blue as a static background.
3.  **Edit:** A new, editable path (in magenta) will be created on a layer on top of the background. It will start as a copy of the original path.
    -   **Pan:** Click and drag the map background.
    -   **Move Waypoint:** Click and drag a waypoint to an empty area.
    -   **Re-order Path:** Drag a waypoint and drop it onto another waypoint.
    -   **Add Waypoint:** Double-click on an empty area of the map.
    -   **Edit Waypoint:** Double-click on an existing waypoint to edit its values in a popup.
    -   **Delete Waypoint:** Right-click on a waypoint.
4.  **Export:** Use the "Export CSV" button to download a CSV file of your modified waypoint path.
