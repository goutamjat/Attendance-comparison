async function compareAttendance(subjectData, commonData) {
    let results = [];

    const allSubjectData = subjectData.flat();

    const studentAttendanceMap = new Map();

    allSubjectData.forEach(student => {
        const key = student.name;
        if (!studentAttendanceMap.has(key)) {
            studentAttendanceMap.set(key, {
                total_classes_held: 0,
                total_classes_attended: 0
            });
        }
        const record = studentAttendanceMap.get(key);
        record.total_classes_held += student.total_classes_held;
        record.total_classes_attended += student.total_classes_attended;
    });

    for (const common of commonData) {
        const key = common.name;
        const record = studentAttendanceMap.get(key);

        if (record) {
            const expectedClassesHeld = record.total_classes_held;
            const expectedClassesAttended = record.total_classes_attended;
            const actualClassesHeld = common.total_classes_held;
            const actualClassesAttended = common.total_classes_attended;

            if (expectedClassesHeld !== actualClassesHeld || expectedClassesAttended !== actualClassesAttended) {
                results.push({
                    name: key,
                    expected: {
                        classesHeld: expectedClassesHeld,
                        classesAttended: expectedClassesAttended
                    },
                    actual: {
                        classesHeld: actualClassesHeld,
                        classesAttended: actualClassesAttended
                    },
                    matched: false
                });
            } else {
                results.push({
                    name: key,
                    matched: true
                });
            }
        } else {
            results.push({
                name: key,
                expected: {
                    classesHeld: 0,
                    classesAttended: 0
                },
                actual: {
                    classesHeld: common.total_classes_held,
                    classesAttended: common.total_classes_attended
                },
                matched: false
            });
        }
    }

    return results;
}

module.exports = { compareAttendance };
