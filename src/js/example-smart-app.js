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

        let patientData;
        let medicationData;
        let relatedPersonData;

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
            patientData = data;
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
          baseUrl + "/api/smart-on-fhir/ehr-data/medication/" + patientId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Medication data:", data);
            updateMedicationFields(data);
            medicationData = data;
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching medication data:", error);
            onError();
            ret.reject(error);
          });

        fetch(
          baseUrl + "/api/smart-on-fhir/ehr-data/related-person/" + patientId,
          requestOptions,
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Fetched Related Person data:", data);
            updateRelatedPersonFields(data);
            relatedPersonData = data;
            ret.resolve(data);
          })
          .catch((error) => {
            console.error("Error fetching related person data:", error);
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
          document.getElementById("submit-external-system-dialog").showModal();
        });

        $("#cancel").click(function () {
          document.getElementById("submit-external-system-dialog").close();
        });

        $("#confirm").click(function () {
          const dataToSend = collectDataForSubmission(patientData, medicationData, relatedPersonData);
          sendDataToExternalSystem(dataToSend)
            .then(response => {
              console.log("Data successfully sent to the external system", response);
              document.getElementById("dialog").showModal();
            })
            .catch(error => {
              console.error("Failed to send data", error);
            });
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
    window.location.href = "lab-result-status.html";
  });

  function collectDataForSubmission(patientData, medicationData, relatedPersonData) {
    let data = {};
    if (document.getElementById("patient-information").checked) {
      data.patientInfo = patientData;
    }
    if (document.getElementById("prescription-information").checked) {
      data.prescriptionInfo = medicationData;
    }
    if (document.getElementById("person-information").checked) {
      data.relatedPersonInfo = relatedPersonData;
    }
    return data;
  }

  function sendDataToExternalSystem(data) {
    console.log("Sending the following data to the external system:", data);
    return fetch('https://webhook.site/96f7774c-66d1-467d-bdb7-44a1cce739c3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
        return response.text();
      });
  }


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

  function updateMedicationFields(data) {
    if (data.length > 0) {
      data.forEach((element) => {
        $("#pharmaceutical-information").append(
          `<tr class="border-b border-azo_pink last:border-0">
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Medication}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.PrescribedBy}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Dosage}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Timing}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Route}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Status}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${formatDate(element.PrescriptionDate)}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.RefillsAllowed}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.ReasonForPrescription}</td>
      </tr>`,
        );
      });
    }
  }

  function updateRelatedPersonFields(data) {
    if (data.length > 0) {
      data.forEach((element) => {
        $("#related-person").append(
          `<tr class="border-b border-azo_pink last:border-0">
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.name}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Relationship}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Contact}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Address}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Gender}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.DateOfBirth}</td>
        <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.RelevantPeriod}</td>
      </tr>`,
        );
      });
    } else {
      const relatedPersonData = [
        {
          "name": "Margaret MacGyver",
          "Relationship": "Wife",
          "Contact": "+15559299218",
          "Address": "315 Lehner Landing Apt 79, West Springfield Town, Massachusetts 01089, US",
          "Gender": "Female",
          "DateOfBirth": "1920-05-15",
          "RelevantPeriod": "1940-2024"
        },
        {
          "name": "Charles MacGyver",
          "Relationship": "Son",
          "Contact": "+15559292222",
          "Address": "320 Lehner Landing Apt 80, West Springfield Town, Massachusetts 01089, US",
          "Gender": "Male",
          "DateOfBirth": "1941-10-09",
          "RelevantPeriod": "1941-2024"
        },
        {
          "name": "Lucy MacGyver",
          "Relationship": "Daughter",
          "Contact": "+15559331234",
          "Address": "315 Lehner Landing Apt 79, West Springfield Town, Massachusetts 01089, US",
          "Gender": "Female",
          "DateOfBirth": "1943-03-22",
          "RelevantPeriod": "1943-2024"
        },
        {
          "name": "Edward MacGyver",
          "Relationship": "Brother",
          "Contact": "+15559294847",
          "Address": "500 Rural Route, West Springfield Town, Massachusetts 01089, US",
          "Gender": "Male",
          "DateOfBirth": "1912-08-15",
          "RelevantPeriod": "1912-2024"
        },
        {
          "name": "Sophia MacGyver",
          "Relationship": "Sister",
          "Contact": "+15559295678",
          "Address": "315 Lehner Landing Apt 81, West Springfield Town, Massachusetts 01089, US",
          "Gender": "Female",
          "DateOfBirth": "1918-11-30",
          "RelevantPeriod": "1918-2024"
        }
      ]

      relatedPersonData.forEach((element) => {
        $("#related-person").append(
          `<tr class="border-b border-azo_pink last:border-0">
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.name}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Relationship}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Contact}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Address}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.Gender}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.DateOfBirth}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${element.RelevantPeriod}</td>
          </tr>`
        );
      });
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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
