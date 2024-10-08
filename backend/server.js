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
    const pythonScriptPath = path.join(__dirname, 'ocr.py');
    
    return new Promise((resolve, reject) => {
        const command = `python "${pythonScriptPath}" "${filePath}" "${outputFilePath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(stderr);
                return;
            }
            resolve(stdout);
        });
    });
}
app.post('/compare', upload.fields([{ name: 'subjectSheet' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFile = req.files.subjectSheet[0].path;
    const commonFile = req.files.commonSheet[0].path;
    const subjectName = req.body.subjectName;

    try {
        //subject attendance sheet
        const outputJSON = path.join(uploadDir, 'subject_data.json');
        await runPythonOCR(commonFile, outputJSON);
        const subjectData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;


        await createTableForSubject(subjectName);
        const insertedData = await processStudentData(subjectData, subjectName);
        

        
        const commonOutputJSON = path.join(uploadDir, 'common_data.json');
        await runPythonOCR(commonFile, commonOutputJSON);
        const commonData = JSON.parse(fs.readFileSync(commonOutputJSON, 'utf-8')).extracted_text;
        /*
        * *area for the process 
        * *of the data in the common attendance sheet
        * *
        * *
        */
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
