const express = require('express');
const multer = require('multer');
const path = require('path');
const pdf = require('pdf-parse');
const fs = require('fs');
const { exec } = require('child_process');
const { createTableForSubject, processStudentData } = require('./database');
const {extractAttendanceForSubject} = require('./extractAttendance');
const {runPythonOCR} = require('./runPythonOCR');
const app = express();


const uploadDir = path.join(__dirname, 'uploads');

app.use(express.static(path.join(__dirname, '../frontend')));

const upload = multer({ dest: uploadDir });

function extractTextFromPDF(pdfFilePath) {
    const dataBuffer = fs.readFileSync(pdfFilePath);
    return pdf(dataBuffer).then(function (data) {
        return data.text;
    });
}


app.post('/compare', upload.fields([{ name: 'subjectSheet' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFile = req.files.subjectSheet[0].path;
    const commonFile = req.files.commonSheet[0].path;
    const subjectName = req.body.subjectName;

    try {
        const commonPdfText = await extractTextFromPDF(commonFile);
        const attendanceForSubject = extractAttendanceForSubject(commonPdfText, subjectName);




        //subject attendance sheet
        // const outputJSON = path.join(uploadDir, 'subject_data.json');
        // await runPythonOCR(subjectFile, outputJSON);
        // const subjectData = JSON.parse(fs.readFileSync(outputJSON, 'utf-8')).extracted_text;

        // await createTableForSubject(subjectName);
        // const insertedData = await processStudentData(subjectData, subjectName);


        console.log('Extracted attendance data for subject:', subjectName, attendanceForSubject);

        res.status(200).send({
            common: attendanceForSubject,
            message: "Common attendance sheet processed successfully."
        });
        console.log('PDF extraction and data processing for both sheets completed.');
        
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send({ error: 'Processing failed' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
