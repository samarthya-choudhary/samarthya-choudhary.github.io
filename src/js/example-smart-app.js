(function (window) {
  window.extractData = function () {
    var ret = $.Deferred();

    function onError(error) {
      console.error("Loading error", error);
      ret.reject(error);
    }

    function onReady(client) {
      if (client.hasOwnProperty("patient")) {
        console.log("client", client);
        var patientId = client.patient.id;
        var providerId = client.user?.id || "e6aw6-RJuKO2mbqjleKvgVQ3";

        var authToken = client.state.tokenResponse.access_token;

        console.log("Patient ID:", patientId);
        console.log("Provider ID:", providerId);
        console.log("Auth Token:", authToken);

        let patientData;
        let medicationData;
        let relatedPersonData;

        // Fetch Patient Data
        client.request(`Patient/${patientId}`)
          .then((patient) => {
            console.log("Fetched patient data:", patient);
            updatePatientFields(patient);
            patientData = patient;
          })
          .catch((error) => {
            console.error("Error fetching patient data:", error);
          });

        // Fetch Coverage Data
        client.request(`Coverage?patient=${patientId}`)
          .then((coverageBundle) => {
            console.log("Fetched coverage data:", coverageBundle);
            const coverages = coverageBundle.entry ? coverageBundle.entry.map(entry => entry.resource) : [];
            updatePolicyFields(coverages);
          })
          .catch((error) => {
            console.error("Error fetching coverage data:", error);
          });

        // Fetch MedicationRequest Data
        client.request(`MedicationRequest?patient=${patientId}`)
          .then((medBundle) => {
            console.log("Fetched medication data:", medBundle);
            const medications = medBundle.entry ? medBundle.entry.map(entry => entry.resource) : [];
            updateMedicationFields(medications);
            medicationData = medications;
          })
          .catch((error) => {
            console.error("Error fetching medication data:", error);
          });

        // Care Team
        client.request(`CareTeam?patient=${patientId}`)
          .then((careTeamBundle) => {
            console.log("Fetched CareTeam data:", careTeamBundle);
            const careTeams = careTeamBundle.entry ? careTeamBundle.entry.map(entry => entry.resource) : [];
            processCareTeams(careTeams);
          })
          .catch((error) => {
            console.error("Error fetching CareTeam data:", error);
          });

        // Fetch Practitioner Data
        client.request(`Practitioner/${providerId}`)
          .then((practitioner) => {
            console.log("Fetched practitioner data:", practitioner);
            updateProviderFields(practitioner);
          })
          .catch((error) => {
            console.error("Error fetching practitioner data:", error);
          });

        // Event Listeners for UI interactions
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

        ret.resolve();
      } else {
        onError(new Error("No patient context available"));
      }
    }

    FHIR.oauth2.ready().then(onReady).catch(onError);
    return ret.promise();
  };

  document.getElementById("close").addEventListener("click", function () {
    window.location.href = "lab-result-status.html";
  });

  function processCareTeams(careTeams) {
    let relatedPersonIds = new Set();

    careTeams.forEach((careTeam) => {
      if (careTeam.participant && careTeam.participant.length > 0) {
        careTeam.participant.forEach((participant) => {
          if (participant.member && participant.member.reference) {
            let reference = participant.member.reference;
            if (reference.startsWith('RelatedPerson/')) {
              let relatedPersonId = reference.split('/')[1];
              relatedPersonIds.add(relatedPersonId);
            }
          }
        });
      }
    });

    relatedPersonIds = Array.from(relatedPersonIds);
    fetchRelatedPersons(relatedPersonIds);
  }

  function fetchRelatedPersons(relatedPersonIds) {
    let promises = relatedPersonIds.map((id) => {
      return client.request(`RelatedPerson/${id}`)
        .then((relatedPerson) => {
          console.log(`Fetched RelatedPerson ${id}:`, relatedPerson);
          return relatedPerson;
        })
        .catch((error) => {
          console.error(`Error fetching RelatedPerson ${id}:`, error);
          return null;
        });
    });
  
    Promise.all(promises)
      .then((relatedPersons) => {
        relatedPersons = relatedPersons.filter(rp => rp !== null);
        updateRelatedPersonFields(relatedPersons);
      })
      .catch((error) => {
        console.error("Error fetching RelatedPerson resources:", error);
      });
  }
  

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
    return fetch('https://webhook.site/your-webhook-url', { // Replace with your actual endpoint
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

  function updatePatientFields(patient) {
    const name = patient.name && patient.name[0] ? `${patient.name[0].given.join(' ')} ${patient.name[0].family}` : "Unknown";
    const birthDate = patient.birthDate || "Unknown";
    const gender = patient.gender || "Unknown";
    const address = patient.address && patient.address[0] ? formatAddress(patient.address[0]) : "Unknown";
    const phone = patient.telecom && patient.telecom.find(t => t.system === 'phone') ? patient.telecom.find(t => t.system === 'phone').value : "Unknown";

    $("#patient-name").text(name);
    $("#patient-dob").text(birthDate);
    $("#patient-sex").text(gender);
    $("#patient-address").text(address);
    $("#patient-phone").text(phone);
    $("#patient-id").text(patient.id || "Unknown");
    $("#holder").show();
  }

  function updatePolicyFields(coverages) {
    if (coverages.length > 0) {
      const coverage = coverages[0];
      $("#patient-policy").text(coverage.id || "Unknown");
      $("#policy-status").text(coverage.status || "Unknown");
      const payer = coverage.payor && coverage.payor[0] ? coverage.payor[0].display || coverage.payor[0].reference : "Unknown";
      $("#policy-payer").text(payer);
    } else {
      $("#patient-policy").text("Unknown");
      $("#policy-status").text("Unknown");
      $("#policy-payer").text("Unknown");
    }
  }

  function updateMedicationFields(medications) {
    if (medications.length > 0) {
      medications.forEach((medRequest) => {
        const medication = medRequest.medicationCodeableConcept ? medRequest.medicationCodeableConcept.text : "Unknown Medication";
        const prescribedBy = medRequest.requester && medRequest.requester.display ? medRequest.requester.display : "Unknown Prescriber";
        const dosage = medRequest.dosageInstruction && medRequest.dosageInstruction[0] && medRequest.dosageInstruction[0].text ? medRequest.dosageInstruction[0].text : "Unknown Dosage";
        const timing = medRequest.dosageInstruction && medRequest.dosageInstruction[0] && medRequest.dosageInstruction[0].timing ? formatTiming(medRequest.dosageInstruction[0].timing) : "Unknown Timing";
        const route = medRequest.dosageInstruction && medRequest.dosageInstruction[0] && medRequest.dosageInstruction[0].route && medRequest.dosageInstruction[0].route.text ? medRequest.dosageInstruction[0].route.text : "Unknown Route";
        const status = medRequest.status || "Unknown";
        const prescriptionDate = medRequest.authoredOn || "Unknown";
        const refills = medRequest.dispenseRequest && medRequest.dispenseRequest.numberOfRepeatsAllowed !== undefined ? medRequest.dispenseRequest.numberOfRepeatsAllowed : "Unknown";
        const reason = medRequest.reasonCode && medRequest.reasonCode[0] && medRequest.reasonCode[0].text ? medRequest.reasonCode[0].text : "Unknown Reason";

        $("#pharmaceutical-information").append(
          `<tr class="border-b border-azo_pink last:border-0">
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${medication}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${prescribedBy}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${dosage}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${timing}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${route}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${status}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${formatDate(prescriptionDate)}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${refills}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${reason}</td>
          </tr>`
        );
      });
    } else {
      $("#pharmaceutical-information").append(
        `<tr>
          <td colspan="9" class="px-4 py-2 font-inter text-sm font-normal text-black">No medication requests found.</td>
        </tr>`
      );
    }
  }

  function updateRelatedPersonFields(relatedPersons) {
    if (relatedPersons.length > 0) {
      relatedPersons.forEach((person) => {
        const name = person.name && person.name[0] ? `${person.name[0].given.join(' ')} ${person.name[0].family}` : "Unknown";
        const relationship = person.relationship && person.relationship[0] && person.relationship[0].coding && person.relationship[0].coding[0] && person.relationship[0].coding[0].display ? person.relationship[0].coding[0].display : "Unknown";
        const contact = person.telecom && person.telecom[0] ? person.telecom[0].value : "Unknown";
        const address = person.address && person.address[0] ? formatAddress(person.address[0]) : "Unknown";
        const gender = person.gender || "Unknown";
        const birthDate = person.birthDate || "Unknown";
        const relevantPeriod = person.period ? `${formatDate(person.period.start)} - ${formatDate(person.period.end)}` : "Unknown";
  
        $("#related-person").append(
          `<tr class="border-b border-azo_pink last:border-0">
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${name}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${relationship}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${contact}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${address}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${gender}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${birthDate}</td>
            <td class="px-4 py-2 font-inter text-sm font-normal text-black">${relevantPeriod}</td>
          </tr>`
        );
      });
    } else {
      $("#related-person").append(
        `<tr>
          <td colspan="7" class="px-4 py-2 font-inter text-sm font-normal text-black">No related persons found.</td>
        </tr>`
      );
    }
  }
  

  function updateProviderFields(practitioner) {
    const name = practitioner.name && practitioner.name[0] ? `${practitioner.name[0].given.join(' ')} ${practitioner.name[0].family}` : "Unknown";
    const practitionerId = practitioner.id || "Unknown";

    $("#p-1").text(name);
    $("#p-2").text(practitionerId);
  }

  function formatDate(dateString) {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatAddress(address) {
    return [
      address.line ? address.line.join(', ') : '',
      address.city || '',
      address.state || '',
      address.postalCode || '',
      address.country || ''
    ].filter(Boolean).join(', ');
  }

  function formatTiming(timing) {
    if (!timing || !timing.repeat) return "Unknown";
    const repeat = timing.repeat;
    let frequency = repeat.frequency || '';
    let period = repeat.period || '';
    let periodUnit = repeat.periodUnit || '';
    return `${frequency} times every ${period} ${periodUnit}`;
  }

  window.drawVisualization = function () {
    $("#holder").show();
    $("#loading").hide();
  };
})(window);
