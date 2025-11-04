import os
import csv
import yaml
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg') # Use non-interactive backend
import matplotlib.pyplot as plt
import io
import base64
import json
import tempfile
import atexit
import shutil
from flask import Flask, render_template, request, send_file

# --- App Setup ---
app = Flask(__name__)

# Create a temporary directory for file uploads that will be cleaned up on exit
temp_dir = tempfile.mkdtemp()
atexit.register(lambda: shutil.rmtree(temp_dir))

# --- Data Loading Functions ---
class Waypoint:
    def __init__(self, x, y, theta, curvature):
        self.x, self.y, self.theta, self.curvature = x, y, theta, curvature

def load_waypoints_as_objects(filepath):
    waypoints = []
    if not os.path.exists(filepath): return waypoints
    try:
        with open(filepath, mode='r') as file:
            reader = csv.reader(file)
            next(reader)
            for row in reader:
                if len(row) == 5:
                    _, x, y, theta, curvature = map(float, row)
                    waypoints.append(Waypoint(x, y, theta, curvature))
    except Exception as e:
        print(f"[App] Error reading waypoints: {e}")
    return waypoints

def load_map_data(pgm_path, yaml_path):
    try:
        with open(yaml_path, 'r') as f:
            metadata = yaml.safe_load(f)
        img = cv2.imread(pgm_path, cv2.IMREAD_GRAYSCALE)
        if img is None: raise ValueError(f"Could not load image: {pgm_path}")
        return img, metadata
    except Exception as e:
        print(f"[App] Error loading map data: {e}")
        return None, None

# --- Main Route ---
@app.route('/', methods=['GET', 'POST'])
def index():
    map_image_base64 = None
    map_metadata_json = None
    original_waypoints_json = None

    if request.method == 'POST':
        pgm_file = request.files.get('pgm_file')
        yaml_file = request.files.get('yaml_file')
        csv_file = request.files.get('csv_file')

        if not all([pgm_file, yaml_file, csv_file]):
            return render_template('index.html', error="Please upload all three files.")

        # Save files to the temporary directory
        pgm_path = os.path.join(temp_dir, pgm_file.filename)
        yaml_path = os.path.join(temp_dir, yaml_file.filename)
        csv_path = os.path.join(temp_dir, csv_file.filename)
        
        pgm_file.save(pgm_path)
        yaml_file.save(yaml_path)
        csv_file.save(csv_path)

        map_img, map_metadata = load_map_data(pgm_path, yaml_path)
        original_waypoints = load_waypoints_as_objects(csv_path)

        if map_img is not None and map_metadata is not None:
            height, width = map_img.shape
            metadata_for_js = {
                "resolution": map_metadata.get('resolution', 0.05),
                "origin": map_metadata.get('origin', [0,0,0]),
                "width": width,
                "height": height
            }
            map_metadata_json = json.dumps(metadata_for_js)

            fig = plt.figure(figsize=(width/100.0, height/100.0), dpi=100)
            ax = fig.add_axes([0, 0, 1, 1])
            ax.imshow(map_img, cmap='gray', origin='lower')

            if original_waypoints:
                resolution = metadata_for_js['resolution']
                origin_x, origin_y = metadata_for_js['origin'][0], metadata_for_js['origin'][1]
                px_coords = np.array([((wp.x - origin_x) / resolution, (wp.y - origin_y) / resolution) for wp in original_waypoints])
                ax.plot(px_coords[:, 0], px_coords[:, 1], 'b.-', label='Original Path', linewidth=0.5, markersize=1)
                ax.plot(px_coords[0, 0], px_coords[0, 1], 'go', markersize=2, label='Start')
                ax.plot(px_coords[-1, 0], px_coords[-1, 1], 'ro', markersize=2, label='End')
            
            ax.axis('off')
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
            plt.close(fig)
            buf.seek(0)
            map_image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

            original_waypoints_json = "[]"
            if original_waypoints:
                original_waypoints_for_js = [{"x": wp.x, "y": wp.y, "theta": wp.theta, "curvature": wp.curvature} for wp in original_waypoints]
                original_waypoints_json = json.dumps(original_waypoints_for_js)

    return render_template('index.html', 
                           map_image_base64=map_image_base64, 
                           map_metadata_json=map_metadata_json,
                           original_waypoints_json=original_waypoints_json)

# --- Export Endpoints ---
@app.route('/api/export_csv', methods=['POST'])
def export_csv():
    waypoints = request.json.get('waypoints', [])
    if not waypoints: return "No waypoints to export", 400
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['time', 'x', 'y', 'theta', 'curvature'])
    for i, wp in enumerate(waypoints):
        writer.writerow([i, wp['x'], wp['y'], wp.get('theta', 0), wp.get('curvature', 0)])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', as_attachment=True, download_name='new_waypoints.csv')

# --- Main execution ---
def main():
    print("Starting wPGM Editor...")
    print("Navigate to http://127.0.0.1:5000 in your web browser.")
    app.run(host='127.0.0.1', port=5000, debug=False)

if __name__ == '__main__':
    main()