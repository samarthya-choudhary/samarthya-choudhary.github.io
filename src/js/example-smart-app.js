(function (window) {
  window.extractData = function () {
    var ret = $.Deferred();

    function onError() {
      console.log("Loading error", arguments);
      ret.reject();
    }

    function onReady(smart) {
      if (smart.hasOwnProperty("patient")) {
        var authToken = smart.server.auth.token;
        var patientId = smart.patient.id;
        var providerId = smart.tokenResponse.user;
        const baseUrl = "http://localhost:3000";

        console.log("Patient ID:", patientId);
        console.log("Provider ID:", providerId);
        console.log("Auth Token:", authToken);

        const requestOptions = {
          method: "GET",
          redirect: "follow",
          headers: {
            Authorization: "Bearer " + authToken,
            "Content-Type": "application/json",
          },
        };

        let name;
        let gender;
        let birthDate;
        let address;
        let phone = 676;

        const data = fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/patient/" + patientId,
          requestOptions,
        )
          .then((response) => response.text())
          .then((result) => console.log(result))
          .catch((error) => console.error(error));

        name = data.Name;
        gender = data.Gender;
        birthDate = data.BirthDate;
        address = data.Addresses;

        const nameElement = document.getElementById("patient-name");

        nameElement.innerHTML = name;

        $("#patient-name").text(name || "Unknown");
        $("#holder").show();

        // fetch(baseUrl + "/api/smart-on-fhir/ehr-data/patient/" + patientId, requestOptions)
        // .then(response => response.json())
        // .then(data => {
        //     updatePatientFields(data);
        // })
        // .catch(error => {
        //     console.error("Error fetching patient data:", error);
        //     onError();
        // });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();
  };

  function updatePatientFields(data) {
    // Assuming 'data' is an object with patient information
    $("#patient-name").text(data.Name || "Unknown");
    $("#patient-dob").text(data.BirthDate || "Unknown");
    $("#patient-sex").text(data.Gender || "Unknown");
    $("#patient-address").text(data.Address || "Unknown");
    $("#patient-phone").text(data.Phone || "Unknown");
    // Add other fields similarly...
  }
  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
