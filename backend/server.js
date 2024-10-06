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
app.post('/compare', upload.fields([{ name: 'subjectSheet' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFile = req.files.subjectSheet[0].path;
    const commonFile = req.files.commonSheet[0].path;
    const subjectName = req.body.subjectName;

    try {
        const outputJSON = path.join(uploadDir, 'extracted_data.json');
        
        // Run OCR on the common sheet first
        runPythonOCR(commonFile, outputJSON, async (err, result) => {
            if (err) {
                console.error('Error in OCR execution:', err);
                res.status(500).send({ error: 'OCR processing failed.' });
                return;
            }

            try {
                const extractedData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;
                
                if (!subjectName) {
                    console.error('Subject name not provided.');
                    res.status(400).send({ error: 'Subject name is required.' });
                    return;
                }

                // Create the table for the subject in the database
                await createTableForSubject(subjectName);

                // Run OCR on the subject sheet to get the attendance data
                runPythonOCR(subjectFile, outputJSON, async (err, result) => {
                    if (err) {
                        console.error('Error in OCR execution for subject sheet:', err);
                        res.status(500).send({ error: 'OCR processing failed for subject sheet.' });
                        return;
                    }

                    const subjectData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;

                    // Process the student data from the extracted text
                    const insertedData = await processStudentData(subjectData, subjectName);

                    // Compare the data from the subject sheet with the common sheet
                    const discrepancies = compareAttendanceData(extractedData, insertedData);

                    // Send the result back to the client
                    res.status(200).send(discrepancies);
                });
            } catch (jsonParseError) {
                console.error('Error parsing extracted data:', jsonParseError);
                res.status(500).send({ error: 'Failed to process extracted data.' });
            }
        });
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send({ error: 'Processing failed' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
