const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compareAttendance } = require('./compare');
const Tesseract = require('tesseract.js');
const mysql = require('mysql2');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });


const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Goutamjat@0',
    database: 'attendance_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/compare', upload.fields([{ name: 'subjectSheets' }, { name: 'commonSheet' }]), async (req, res) => {
    const subjectFiles = req.files.subjectSheets.map(file =>file.path);
    const commonFile = req.files.commonSheet[0].path;

    try {
        const subjectDataPromises = subjectFiles.map(file => performOCR(file));
        const commonDataPromise = performOCR(commonFile);

        const [subjectData, commonData] = await Promise.all([
            Promise.all(subjectDataPromises),
            commonDataPromise
        ]);

        await insertAndCompareAttendance(subjectData, commonData, res);
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send({ error: 'Processing failed' });
    }
});

function performOCR(filePath) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(filePath, 'eng', {
            logger: info => console.log(info)  
        })
        .then(({ data: { text } }) => {
            const lines = text.split('\n');
            const data = lines.slice(1).map(line => {
                const parts = line.split(/\s+/);
                if (parts.length >= 4) {
                    return {
                        name: parts[0],
                        total_classes_held: parseInt(parts[1], 10),
                        total_classes_attended: parseInt(parts[2], 10)
                    };
                }
            }).filter(item => item !== undefined);
            resolve(data);
        })
        .catch(err => reject(err));
    });
}

async function insertAndCompareAttendance(subjectData, commonData, res) {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Database connection error:', err);
            return res.status(500).send({ error: 'Database connection failed' });
        }

        try {
            
            for (const subject of subjectData) {
                for (const student of subject) {
                    let studentResult = await query(connection, 'SELECT id FROM students WHERE name = ?', [student.name]);

                    if (studentResult.length === 0) {
                        studentResult = await query(connection, 'INSERT INTO students (name) VALUES (?)', [student.name]);
                    }

                    const studentId = studentResult.insertId || studentResult[0].id;

                    let subjectResult = await query(connection, 'SELECT id FROM subjects WHERE name = ?', ['SubjectName']); // Replace 'SubjectName' with the actual subject name

                    if (subjectResult.length === 0) {
                        subjectResult = await query(connection, 'INSERT INTO subjects (name) VALUES (?)', ['SubjectName']);
                    }

                    const subjectId = subjectResult.insertId || subjectResult[0].id;

                    await query(connection,
                        'INSERT INTO attendance (student_id, subject_id, classes_held, classes_attended) VALUES (?, ?, ?, ?)',
                        [studentId, subjectId, student.total_classes_held, student.total_classes_attended]
                    );
                }
            }

            const comparisonResult = compareAttendance(subjectData, commonData);

            res.json(comparisonResult);
        } catch (error) {
            console.error('Database operation error:', error);
            res.status(500).send({ error: 'Database operation failed' });
        } finally {
            connection.release();
        }
    });
}

function query(connection, sql, params) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
