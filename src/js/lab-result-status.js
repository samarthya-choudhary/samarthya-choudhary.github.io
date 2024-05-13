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
            patientName = data.Name;
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

  function updateLabOrderDetails(data) {
    $("#LOD-1").text("API CALL");
    $("#LOD-2").text("API CALL");
    $("#LOD-3").text("API CALL");
    $("#LOD-4").text("API CALL");
    $("#LOD-5").text("API CALL");
    $("#LOD-6").text("API CALL");
  }

  function updateLabOrderResult(data) {
    data.forEach((element) => {
      $("#lab-order-result").append(
        `<tr class="border-b border-azo_pink last:border-0">
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.one}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.two}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.three}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.four}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.five}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.six}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.seven}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.eight}</td>
      </tr>`,
      );
    });
  }

  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
