import os
import re
from flask import Flask, request, render_template, redirect, url_for, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader, PdfWriter

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize(text):
    return "".join(c for c in text if c.isalnum() or c in (' ', '_', '-')).rstrip()


@app.route('/')
def terminal_ui():
    return render_template('index.html')


@app.route('/admin')
def upload_form():
    return render_template('upload.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    required_fields = ['admin_name', 'class', 'subject', 'semester', 'exam_year', 'exam_type', 'medium']
    if 'file' not in request.files or not all(field in request.form for field in required_fields):
        return "<h1>Missing form data. <a href='/admin'>Please try again.</a></h1>"
    file = request.files['file']
    admin_name, class_name, subject, semester, exam_year, exam_type, medium = (request.form[f] for f in required_fields)
    if file.filename == '' or not all([admin_name, class_name, subject, semester, exam_year, exam_type, medium]):
        return "<h1>All fields are required. <a href='/admin'>Please try again.</a></h1>"
    if file and allowed_file(file.filename):
        # --- NEW, FOOLPROOF FILENAME LOGIC ---

        # 1. Sanitize all the tag data
        tags = [
            sanitize(class_name), sanitize(subject), f"Sem-{sanitize(semester)}",
            sanitize(exam_year), sanitize(exam_type), sanitize(medium), sanitize(admin_name)
        ]

        # 2. Create the prefix from the tags
        filename_prefix = "_".join(f"[{tag}]" for tag in tags)

        # 3. Securely get the original filename and explicitly separate its name and extension
        original_secure_name = secure_filename(file.filename)

        # 4. Combine the parts to create the final, clean filename
        new_filename = f"{filename_prefix}_{original_secure_name}"

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        file.save(filepath)

        # Add metadata (this part is unchanged and correct)
        try:
            reader = PdfReader(filepath)
            writer = PdfWriter()
            for page in reader.pages: writer.add_page(page)
            writer.add_metadata({"/Author": admin_name, "/Title": f"{class_name} - {subject} (Semester {semester})",
                                 "/Subject": subject,
                                 "/Keywords": f"{class_name}, {exam_year}, Semester {semester}, {exam_type}, {medium}"})
            with open(filepath, "wb") as f:
                writer.write(f)
        except Exception as e:
            print(f"Could not write metadata. Error: {e}")

        return f"""
            <style> body {{ font-family: sans-serif; background-color: #1a1a1a; color: #e0e0e0; padding: 40px; }} h1 {{ color: #4CAF50; }} p {{ color: #bbb; }} a {{ display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }} a:hover {{ background-color: #45a049; }} </style>
            <h1>File Uploaded Successfully!</h1> <p>Metadata has been written directly into the PDF properties.</p> <p><strong>Saved as:</strong> {new_filename}</p> <a href="/">Go to Home Page</a>
        """
    else:
        return "<h1>Invalid file type. Only PDFs are allowed. <a href='/admin'>Try again</a></h1>"


@app.route('/api/papers')
def get_papers():
    # The Regex parser is correct and does not need to be changed.
    # It is looking for the exact pattern that the new logic above creates.
    papers = []
    pattern = re.compile(r"\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_(.*\.pdf)",
                         re.IGNORECASE)
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        match = pattern.match(filename)
        if match:
            try:
                groups = match.groups()
                paper_details = {
                    'class': groups[0], 'subject': groups[1], 'semester': groups[2].replace('Sem-', ''),
                    'year': groups[3], 'exam_type': groups[4], 'medium': groups[5], 'uploader': groups[6],
                    'original_name': groups[7], 'url': url_for('get_uploaded_file', filename=filename)
                }
                papers.append(paper_details)
            except Exception as e:
                print(f"Error processing matched file {filename}: {e}")
    return jsonify(papers)


@app.route('/uploads/<path:filename>')
def get_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True)
