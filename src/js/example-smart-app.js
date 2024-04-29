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

        fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/patient/" + patientId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched data:", data);
            data.patientId = patientId;
            updatePatientFields(data);
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching patient data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/coverage/" + patientId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Policy data:", data);
            updatePolicyFields(data);

            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching policy data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/family-history/" + patientId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Family History data:", data);
            updateFamilyHistory(data);
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching family history data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl +
            "/api/smart-on-fhir/external-system/questionnaire-response/",
          patientId,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Questionnaire Response data:", data);
            updateQuestionnaireResponse(data);
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching questionnaire response data:", error);
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
    $("#patient-address").text(data.Addresses[0] || "Unknown");
    $("#patient-phone").text(data.ContactNumbers[0].Number || "Unknown");
    $("#patient-id").text(data.patientId || "Unknown");
    $("#holder").show();
  }

  function updatePolicyFields(data) {
    $("#patient-policy").text(data[0].id || "Unknown");
    $("#policy-status").text(data[0].status || "Unknown");
    $("#policy-payer").text(data[0].payor[0] || "Unknown");
  }

  function updateFamilyHistory(data) {
    data.forEach((element) => {
      $("#family-history").append(
        `<tr class="border-b bg-white">
        <td class="px-4 py-2">${element.name}</td>
        <td class="px-4 py-2">${element.relationship}</td>
        <td class="px-4 py-2">${element.conditions.join(", ")}</td>
      </tr>`,
      );
    });
  }

  function updateQuestionnaireResponse(data) {
    $("#q-1").text(data[0].allergyResponse || "Unknown");
    $("#q-2").text(data[0].medResponse || "Unknown");
    $("#q-3").text(data[0].labResponse || "Unknown");
    $("#q-4").text(data[0].reasonResponse || "Unknown");
    $("#q-5").text(data[0].patient.firstName || "Unknown");
    $("#q-6").text(data[0].patient.lastName || "Unknown");
  }

  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
