const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { createTableForSubject, processStudentData } = require('./database'); // Import the database functions
const app = express();
const uploadDir = path.join(__dirname, 'uploads');

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle file uploads
const upload = multer({ dest: uploadDir });

// Function to run Python OCR script
function runPythonOCR(filePath, outputFilePath) {
    const pythonScriptPath = path.join(__dirname, 'ocr.py'); // Python script path
    
    // Return a new Promise to handle async behavior
    return new Promise((resolve, reject) => {
        // Wrap paths in quotes to handle spaces
        const command = `python "${pythonScriptPath}" "${filePath}" "${outputFilePath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error); // Reject the Promise if there’s an error
                return;
            }
            if (stderr) {
                reject(stderr); // Reject if there’s an error output
                return;
            }
            resolve(stdout); // Resolve the Promise if successful
        });
    });
}

// API endpoint to handle OCR and data processing
app.post('/compare', upload.fields([{ name: 'subjectSheets' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFiles = req.files.subjectSheets.map(file => file.path);
    const commonFile = req.files.commonSheet[0].path;

    try {
        const outputJSON = path.join(uploadDir, 'extracted_data.json');

        // Await the result from the Python OCR process
        await runPythonOCR(commonFile, outputJSON);

        // Now handle the extracted data
        const extractedData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;
        
        const subjectNameMatch = extractedData.match(/BATCH: (\w+)/);
        const subjectName = subjectNameMatch ? subjectNameMatch[1] : 'UnknownSubject';

        if (!subjectName) {
            console.error('Subject name not found in extracted data.');
            res.status(500).send({ error: 'Subject name not found in extracted data.' });
            return;
        }

        console.log(`Subject name extracted: ${subjectName}`);

        // Create the table for the subject
        await createTableForSubject(subjectName);

        // Process the student data and insert into the database
        const insertedData = await processStudentData(extractedData, subjectName);

        // Return the inserted records as an array
        res.status(200).send(insertedData);
        console.log(`Data successfully inserted for ${insertedData.length} students.`);
        
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send({ error: 'Processing failed' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
