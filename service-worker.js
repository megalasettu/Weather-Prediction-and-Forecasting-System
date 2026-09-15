self.addEventListener("push", function (event) {

    const data = event.data
        ? event.data.json()
        : {
            title: "Weather Alert",
            body: "Weather alert at your current location."
        };

    event.waitUntil(
        self.registration.showNotification(
            data.title,
            {
                body: data.body,
                icon: "weather-bg.png"
            }
        )
    );

});