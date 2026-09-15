async function signup() {

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const message = document.getElementById("message");

    if (!name || !email || !password) {
        message.innerText = "Please fill all fields.";
        return;
    }

    try {

        const response = await fetch("http://localhost:3000/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {

            // Save token after successful signup
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            message.innerText = "Signup successful!";
            message.style.color = "green";

            setTimeout(function () {

                // Signup → Search Page
                window.location.href = "../index.html";

            }, 1000);

        } else {

            message.innerText = data.error || "Signup failed.";

        }

    } catch (error) {

        console.error(error);
        message.innerText = "Unable to connect to server.";

    }
}