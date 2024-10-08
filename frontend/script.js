document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    try {
        // Send the form data to the server
        const response = await fetch('/compare', {
            method: 'POST',
            body: formData
        });

        // Check if the response was successful
        if (!response.ok) {
            console.error('Failed to fetch data:', response.statusText);
            return;
        }

        // Parse the JSON response
        const data = await response.json();
        displayResult(data);
    } catch (error) {
        // Handle any errors that occurred during fetch or parsing
        console.error('Error:', error);
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '<p>/</p>';//Error: Unable to fetch or process data.
    }
});

function displayResult(data) {

    // // Find the result container element
    // const resultDiv = document.getElementById('result');

    // // Clear previous results
    // resultDiv.innerHTML = '';

    // Check if data is an array
    if (Array.isArray(data)) {
        // Display each item in the data array
        data.forEach(item => {
            const div = document.createElement('div');
            div.textContent = `Student: ${item.name}, Classes Held: ${item.total_classes_held}, Classes Attended: ${item.total_classes_attended}`;
            resultDiv.appendChild(div);
        });
    } else {
        // If data is not an array, display an error message
        console.error('Data is not an array:', data);
        resultDiv.innerHTML = '<p>Error: Received data is not in the expected format.</p>';
    }
}
