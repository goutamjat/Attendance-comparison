function runPythonOCR(filePath, outputFilePath) {
    const pythonScriptPath = path.join(__dirname, 'ocr.py');
    
    return new Promise((resolve, reject) => {
        const command = `python "${pythonScriptPath}" "${filePath}" "${outputFilePath}"`;

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
module.exports = {
    runPythonOCR
};
