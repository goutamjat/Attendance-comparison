const express = require('express');
const multer = require('multer');
const path = require('path');
const pdf = require('pdf-parse');
const fs = require('fs');
const { exec } = require('child_process');
const { createTableForSubject, processStudentData } = require('./database');
const { extractAttendanceForSubject } = require('./extractAttendance');
const app = express();

const uploadDir = path.join(__dirname, 'uploads');

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Set up multer for file upload handling
const upload = multer({ dest: uploadDir });

// Function to extract text from PDF using the 'pdf-parse' library
function extractTextFromPDF(pdfFilePath) {
    const dataBuffer = fs.readFileSync(pdfFilePath);
    return pdf(dataBuffer).then(function (data) {
        return data.text;
    });
}

// Endpoint to handle the file uploads and processing
app.post('/compare', upload.fields([{ name: 'subjectSheet' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFile = req.files.subjectSheet[0].path;
    const commonFile = req.files.commonSheet[0].path;
    const subjectName = req.body.subjectName;

    try {
        // Paths to save the intermediate and final files
        const outputJSON = path.join(uploadDir, 'subject_data.json');
        const outputExcel = path.join(uploadDir, 'output.xlsx');  // Fixed filename for the Excel output

        // Run the Python OCR script to extract data and generate output.xlsx
        await runPythonOCR(subjectFile, outputJSON);

        // Process the extracted attendance data (from JSON)
        const subjectData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;

        // Insert the attendance data into the database for the given subject
        await createTableForSubject(subjectName);
        const insertedData = await processStudentData(subjectData, subjectName);


        await runPythonPtoE(commonFile,outputExcel);
        console.log('PDF to excel conversion completed.');
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send({ error: 'Processing failed' });
    }
});

// Function to run the Python OCR script
function runPythonOCR(filePath, outputExcelPath) {
    const pythonScriptPath = path.join(__dirname, 'ocr.py');
    
    return new Promise((resolve, reject) => {
        // Command to run the Python script
        const command = `python "${pythonScriptPath}" "${filePath}" "${outputExcelPath}"`;

        // Execute the Python script using the child_process module
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error in Python OCR script:', error);
                reject(error);
                return;
            }
            if (stderr) {
                console.error('Python script stderr:', stderr);
                reject(stderr);
                return;
            }
            console.log('Python script stdout:', stdout);
            resolve(stdout);
        });
    });
}
function runPythonPtoE(pdfFilePath, outputExcelPath) {
    const pythonScriptPath = path.join(__dirname, 'ptoe.py');  // Path to your Python script

    return new Promise((resolve, reject) => {
        // Command to run the ptoe.py Python script with the PDF input and Excel output paths
        const command = `python "${pythonScriptPath}" "${pdfFilePath}" "${outputExcelPath}"`;

        // Execute the Python script using child_process.exec
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error in Python ptoe.py script:', error);
                reject(error);  // Reject the promise with the error
                return;
            }
            if (stderr) {
                console.error('Python script stderr:', stderr);
                reject(stderr);  // Reject the promise with the stderr
                return;
            }
            console.log('Python script stdout:', stdout);  // Log the Python script's output
            resolve(stdout);  // Resolve the promise with the stdout
        });
    });
}

// Start the Express server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
