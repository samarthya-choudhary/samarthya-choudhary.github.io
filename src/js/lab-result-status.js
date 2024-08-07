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
        var providerId = smart.tokenResponse?.user || "a6dfe8e5-f65e-4eda-a572-850f7ac0d7cf";
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
            updatePatientFields(data, patientId);
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

        fetch(
          baseUrl + "/api/smart-on-fhir/external-system/lab-order/patient/" + 12724069,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Policy data:", data);
            data[0].Provider.externalId = providerId;
            data[0].Provider.firstName = "Dr. Jeri Hansen";
            updateLabOrderDetails(data[0]);
            labOrderId = data[0].id;
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching policy data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl + "/api/smart-on-fhir/external-system/lab-order-result/lab-order/2",
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Policy data:", data);
            updateLabOrderResult(data);
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


  function updatePatientFields(data, patientId) {
    $("#patient-name").text(data.Name || "Unknown");
    $("#patient-dob").text(data.BirthDate || "Unknown");
    $("#patient-sex").text(data.Gender || "Unknown");
    $("#patient-address").text(data.Addresses[0] || "Unknown");
    $("#patient-phone").text(data.ContactNumber || "Unknown");
    $("#patient-id").text(patientId || "Unknown");
    $("#holder").show();
  }

  function updatePolicyFields(data) {
    if (data.length > 0 && data[0]) {
      $("#patient-policy").text(data[0].id || "POL123456789");
      $("#policy-status").text(data[0].status || "Active");
      $("#policy-payer").text(data[0].payor[0] || "Blue Cross Blue Shield");
    } else {
      $("#patient-policy").text("POL123456789");
      $("#policy-status").text("Active");
      $("#policy-payer").text("Blue Cross Blue Shield");
    }
  }

  function updateLabOrderDetails(data) {
    $("#LOD-1").text("EMRLAB-1");
    $("#LOD-2").text("EXTLAB0123");
    $("#LOD-3").text(data.status);
    $("#LOD-4").text(data.Provider.firstName);
    $("#LOD-5").text(data.Provider.externalId);
    $("#LOD-6").text("02/05/2024");
  }

  function updateLabOrderResult(data) {
    data.forEach((element) => {
      $("#lab-order-result").append(
        `<tr class="border-b border-azo_pink last:border-0">
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.gene}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.disease}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.modeOfInheritance}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.variant}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.cdna}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.zygosity}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.inheritedFrom}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.classification}</td>
      </tr>`,
      );
    });
  }

  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
