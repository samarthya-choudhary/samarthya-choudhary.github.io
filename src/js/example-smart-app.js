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

        fetch(baseUrl + "/api/smart-on-fhir/ehr-data/patient/" + patientId, requestOptions)
          .then(response => response.json()) // Assuming the API returns JSON data
          .then(data => {
            console.log("Fetched data:", data);  // Data is now an object
            updatePatientFields(data);
            $("#holder").show();
            ret.resolve(data); // Resolving deferred object with data
          })
          .catch(error => {
            console.error("Error fetching patient data:", error);
            onError();
            ret.reject(error);
          });
      } else {
        onError();
        ret.reject(new Error("Smart does not have a patient property"));
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();
  };

  function updatePatientFields(data) {
    $("#patient-name").text(data.Name || "Unknown");
    $("#patient-dob").text(data.BirthDate || "Unknown");
    $("#patient-sex").text(data.Gender || "Unknown");
    $("#patient-address").text(data.Address || "Unknown");
    $("#patient-phone").text(data.Phone || "Unknown");
    // Update other fields as necessary
  }

  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
