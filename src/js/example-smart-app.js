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
        console.log("Smart:", smart);

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

        let questionnaireId;
        let patientName;

        fetch(
          baseUrl +
          "/api/smart-on-fhir/external-system/questionnaire-response/" +
          12724065,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Questionnaire Response data:", data);
            updateQuestionnaireResponse(data);
            questionnaireId = data[0].questionnaireId;
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching questionnaire response data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/practitioner/" + providerId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Provider data:", data);
            updateProviderFields(data, providerId);
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching provider data:", error);
            onError();
            ret.reject(error);
          });

        $("#submit-lab-order").click(function () {
          const myHeaders = new Headers();
          myHeaders.append("Content-Type", "application/json");

          const raw = JSON.stringify({
            providerNotes: $("#p-3").val(),
            questionnaireResponseId: questionnaireId,
            // patientId: Number.parseInt(patientId),
            // providerId: Number.parseInt(providerId),
          });

          const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow",
          };

          fetch(
            "http://localhost:3000/api/smart-on-fhir/external-system/lab-order",
            requestOptions,
          )
            .then((response) => response.text())
            .then((result) => {
              console.log(result);
              document.getElementById("dialog").showModal();
              $("#modal-text").text(
                `Lab Order for ${patientName} (ID: ${patientId})`,
              );
            })
            .catch((error) => console.error(error));
        });
      } else {
        onError();
        ret.reject(new Error("Smart does not have a patient property"));
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();
  };

  document.getElementById("close").addEventListener("click", function () {
    // document.getElementById("dialog").close();
    //navigate to lab-result-status.html
    window.location.href = "lab-result-status.html";
  });

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


  function updateFamilyHistory(data) {
    if (data.length > 0) {
      data.forEach((element) => {
        $("#family-history").append(
          `<tr class="border-b bg-white">
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.name}</td>
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.relationship}</td>
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.conditions.join(", ")}</td>
        </tr>`,
        );
      });
    } else {
      const familyHistoryData = [
        {
          name: "John Balistreri",
          relationship: "Father",
          conditions: ["Hypertension", "Type 2 Diabetes"]
        },
        {
          name: "Maria Balistreri",
          relationship: "Mother",
          conditions: ["Hypothyroidism"]
        },
        {
          name: "Lucas Balistreri",
          relationship: "Brother",
          conditions: ["None"]
        }
      ];
      // $("#family-history").empty();
      familyHistoryData.forEach((element) => {
        $("#family-history").append(
          `<tr class="border-b bg-white">
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.name}</td>
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.relationship}</td>
          <td class="px-4 py-2 font-inter text-lg font-normal text-azo_darkGray">${element.conditions.join(", ")}</td>
        </tr>`,
        );
      });
    }
  }

  function updateQuestionnaireResponse(data) {
    $("#q-1").text(
      (data[0].hasGeneticDisordersResp ? "Yes" : "No") || "Unknown",
    );
    $("#q-2").text(data[0].geneticDisordersSpecResp || "Unknown");
    $("#q-3").text(
      (data[0].hasFamilyGeneticDisordersResp ? "Yes" : "No") || "Unknown",
    );
    $("#q-4").text(data[0].familyGeneticDisordersDescResp || "Unknown");
    $("#q-5").text(data[0].geneticTestingReasonResp || "Unknown");
    $("#q-6").text(data[0].expectationsResp || "Unknown");
    $("#q-7").text(data[0].familiarityResp || "Unknown");
  }

  function updateProviderFields(data, providerId) {
    $("#p-1").text(data.name[0].fullName || "Unknown");
    $("#p-2").text(data.practitionerId || "Unknown");
  }

  window.drawVisualization = function (p) {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
