const mysql = require('mysql2/promise');

// Create the MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Goutamjat@0',
    database: 'attendance_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Utility function to normalize the roll number
function normalizeRollNumber(rollNo) {
    return rollNo.replace(/080[!I]/g, '0801');
}

// Utility function to count occurrences of P's, A's, and .s in attendance data
function countClasses(attendanceString) {
    const totalPresent = (attendanceString.match(/P/g) || []).length;
    const totalClassesHeld = (attendanceString.match(/[PA.]/g) || []).length;
    return { totalPresent, totalClassesHeld };
}

// Function to create a table for the subject if it doesn't exist
async function createTableForSubject(subjectName) {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${mysql.escapeId(subjectName)} (
            roll_no VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255),
            total_classes_attended INT,
            total_classes_held INT
        )
    `;

    try {
        // Use a connection from the pool and execute the query
        const conn = await pool.getConnection();
        await conn.query(createTableQuery);
        conn.release();
        console.log(`Table for ${subjectName} created or already exists.`);
    } catch (err) {
        console.error('Error creating table:', err);
        throw err;
    }
}

// Function to insert or update a student's data into the subject table
async function insertStudentData(subjectName, students) {
    let conn;
    try {
        // Get a connection from the pool
        conn = await pool.getConnection();

        // Loop through each student and insert their data
        for (const student of students) {
            const { rollNumber, studentName, attendedClasses, totalClasses } = student;

            // Corrected insert query for 4 columns
            const insertQuery = `
                INSERT INTO \`${subjectName}\` (roll_no, name, total_classes_attended, total_classes_held)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                total_classes_attended = VALUES(total_classes_attended),
                total_classes_held = VALUES(total_classes_held)
            `;

            // Execute the insert query with actual values for each student
            await conn.execute(insertQuery, [rollNumber, studentName, attendedClasses, totalClasses]);
        }

        console.log(`Data inserted successfully for subject: ${subjectName}`);
    } catch (error) {
        console.error(`Error inserting data for ${subjectName}:`, error);
        throw error;
    } finally {
        if (conn) {
            conn.release(); // Release the connection back to the pool
        }
    }
}


async function processStudentData(extractedData, subjectName) {
    extractedData = extractedData.replace(/0801[^0-9]/, '0801'); 
    const cleanedData = extractedData.replace(/\n/g, ' ');

    const lines = cleanedData.split(/(?=0801)/);

    lines.forEach((line) => {
        console.log("Splitted Lines:", line);
    });
    
    const students = [];
let maxTotalClasses = 0;

// Loop through each line and process it
lines.forEach((line, index) => {
    const cleanedLine = line.replace(/\t/g, ',').trim();
    const parts = cleanedLine.split(',');

    // Extract the roll number (last 3 digits of the enrollment number)
    let rollNumber = parts[0].replace(/[^\d]/g, '').slice(-3); // Remove non-digits and get last 3 digits

    // Extract student first name (assuming it's the second element)
    const studentName = parts[1]; // First name is the second word in the line

    // Extract attendance data (skip the first 3 parts)
    let attendanceData = parts.slice(2).join(' ').replace(/\s+/g, ' '); // Combine and clean extra spaces

    attendanceData = attendanceData.replace(/\d+/g, ''); // Remove numbers
    // Initialize attendance counts
    let attendedClasses = 0;
    let totalClasses = 0;

    // Process each attendance entry in the attendance string
    const attendanceEntries = attendanceData.split(/\s+/);
    attendanceEntries.forEach((entry) => {
        let localTotal = 0;
        entry.split('').forEach((char) => {
            if (char === 'P' || char === 'A') {
                localTotal++; // Count A or P as a class held
            }
            if (char === 'P') {
                attendedClasses++; // Count P as attended
            }
        });
        totalClasses += localTotal; // Add to total classes held for this student
    });

    // Update the maxTotalClasses if the current student has more classes
    maxTotalClasses = Math.max(maxTotalClasses, totalClasses);

    // Log the student data for debugging
    console.log(`Processing student: Roll No: ${rollNumber}, Name: ${studentName}, Attended: ${attendedClasses}, Total: ${totalClasses}`);

    // Insert the student's data into the students array
    students.push({
        rollNumber,
        studentName,
        attendedClasses,
        totalClasses
    });
});

// After processing all students, normalize total classes based on maxTotalClasses
students.forEach(student => {
    student.totalClasses = maxTotalClasses; // Set the total classes for all students to the max found
    console.log(`Final Data: Roll No: ${student.rollNumber}, Name: ${student.studentName}, Attended: ${student.attendedClasses}, Total Classes: ${student.totalClasses}`);
});

console.log(students);

    // Create table if it doesn't exist
    await createTableForSubject(subjectName);

    // Insert the processed student data into the database (function already written)
    await insertStudentData(subjectName, students);

    return students; // Return the inserted student records
}

// Exporting the functions to use in other files
module.exports = {
    createTableForSubject,
    processStudentData,
    insertStudentData
};
