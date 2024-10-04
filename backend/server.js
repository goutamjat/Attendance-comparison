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
function runPythonOCR(filePath, outputFilePath, callback) {
    const pythonScriptPath = path.join(__dirname, 'ocr.py'); // Python script path
    
    // Wrap paths in quotes to handle spaces
    const command = `python "${pythonScriptPath}" "${filePath}" "${outputFilePath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
            return;
        }
        if (stderr) {
            callback(stderr, null);
            return;
        }
        callback(null, stdout);
    });
}

// API endpoint to handle OCR and data processing
app.post('/compare', upload.fields([{ name: 'subjectSheets' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFiles = req.files.subjectSheets.map(file => file.path);
    const commonFile = req.files.commonSheet[0].path;

    try {
        const outputJSON = path.join(uploadDir, 'extracted_data.json');
        runPythonOCR(commonFile, outputJSON, async (err, result) => {
            if (err) {
                console.error('Error in OCR execution:', err);
                res.status(500).send({ error: 'OCR processing failed.' });
                return;
            }

            try {
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
