(function (window) {
  window.extractData = function () {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart) {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
          type: 'Observation',
          query: {
            code: {
              $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
            }
          }
        });

        var familyMemberHistory = smart.patient.api.fetchAll({
          type: 'FamilyMemberHistory',
          query: { patient: pt.id }
        });

        console.log(familyMemberHistory);

        $.when(pt, obv, familyMemberHistory).fail(onError);

        $.when(pt, obv, familyMemberHistory).done(function (patient, obv, familyHistories) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          displayFamilyHistory(familyHistories);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient() {
    return {
      fname: { value: '' },
      lname: { value: '' },
      gender: { value: '' },
      birthdate: { value: '' },
      height: { value: '' },
      systolicbp: { value: '' },
      diastolicbp: { value: '' },
      ldl: { value: '' },
      hdl: { value: '' },
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function (observation) {
      var BP = observation.component.find(function (component) {
        return component.code.coding.find(function (coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
      return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  function displayFamilyHistory(familyHistories) {
    var tbody = $('#familyHistory tbody');
    tbody.empty();

    if (!familyHistories) {
      console.log('No family histories provided');
      return;
    }

    familyHistories.forEach(function (history) {
      if (!history) {
        console.log('Invalid history entry', history);
        return;
      }

      var status = history.status || 'Unknown';
      var relationship = (history.relationship && history.relationship.text) ? history.relationship.text : 'Not specified';
      var deceased = (typeof history.deceasedBoolean === 'boolean') ? (history.deceasedBoolean ? 'Yes' : 'No') : 'Unknown';
      var sex = (history.sex.text) ? history.sex.text : 'Unknown';
      // var conditions = (history.condition && history.condition.length > 0) ? history.condition : "Conditions not available";
      var conditionDetails = '';

      if (history.condition && history.condition.length > 0) {
        history.condition.forEach(function (condition) {
          var conditionText = condition.code && condition.code.text ? condition.code.text : 'Unknown condition';
          var positiveOrNegative = condition.modifierExtension && condition.modifierExtension.length > 0 && condition.modifierExtension[0].valueCodeableConcept
            ? condition.modifierExtension[0].valueCodeableConcept.text : 'Result not specified';
          var ageOfOnset = condition.onsetAge ? condition.onsetAge.value + ' ' + condition.onsetAge.unit : 'Age of onset not specified';

          conditionDetails += conditionText + ' (' + positiveOrNegative + '), ' + ageOfOnset + '; ';
        });
      } else {
        conditionDetails = 'No conditions reported';
      }


      tbody.append(
        '<tr><td>' + relationship + '</td><td>' + sex + '</td><td>' + status + '</td><td>' + deceased + '</td><td>' + conditionDetails + '</td></tr>'
      );
    });
  }



  window.drawVisualization = function (p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
