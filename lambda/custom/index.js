const Alexa = require('ask-sdk-core');
var http = require('http');
// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-east-1'}); // N. Virginia

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const messages = {
  WELCOME: 'Welcome to the Reminders API Demo Skill!  You can say "create a reminder" to create a reminder.  What would you like to do?',
  WHAT_DO_YOU_WANT: 'What would you like to do?',
  NOTIFY_MISSING_PERMISSIONS: 'Please enable Reminder permissions in the Amazon Alexa app using the card I\'ve sent to your Alexa app.',
  ERROR: 'Uh Oh. Looks like something went wrong.',
  API_FAILURE: 'There was an error with the Reminders API.',
  GOODBYE: 'Bye! Thanks for using the Reminders API Skill!',
  UNHANDLED: 'This skill doesn\'t support that. Please ask something else.',
  HELP: 'You can use this skill by asking something like: create a reminder?',
  REMINDER_CREATED: 'OK, I will remind you.',
  UNSUPPORTED_DEVICE: 'Sorry, this device doesn\'t support reminders.',
  WELCOME_REMINDER_COUNT: 'Welcome to the Reminders API Demo Skill.  The number of your reminders related to this skill is ',
  NO_REMINDER: 'OK, I won\'t remind you.',
};

const PERMISSIONS = ['alexa::alerts:reminders:skill:readwrite'];

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const responseBuilder = handlerInput.responseBuilder;
    const consentToken = requestEnvelope.context.System.apiAccessToken;

    if (!consentToken) {
      // if no consent token, skip getting reminder count
      return responseBuilder
        .speak(messages.WELCOME)
        .reprompt(messages.WHAT_DO_YOU_WANT)
        .getResponse();
    }
    try {
      const client = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
      const remindersResponse = await client.getReminders();
      console.log(JSON.stringify(remindersResponse));

      // reminders are retained for 3 days after they 'remind' the customer before being deleted
      const remindersCount = remindersResponse.totalCount;

      return responseBuilder
        .speak(`${messages.WELCOME_REMINDER_COUNT} ${remindersCount}. ${messages.WHAT_DO_YOU_WANT}`)
        .reprompt(messages.WHAT_DO_YOU_WANT)
        .getResponse();
    } catch (error) {
      console.log(`error message: ${error.message}`);
      console.log(`error stack: ${error.stack}`);
      console.log(`error status code: ${error.statusCode}`);
      console.log(`error response: ${error.response}`);

      if (error.name === 'ServiceError' && error.statusCode === 401) {
        console.log('No reminders permissions (yet).  Skipping reporting on reminder count.');
        return responseBuilder
          .speak(messages.WELCOME)
          .reprompt(messages.WHAT_DO_YOU_WANT)
          .getResponse();
      }
      if (error.name !== 'ServiceError') {
        console.log(`error: ${error.stack}`);
        const response = responseBuilder.speak(messages.ERROR).getResponse();
        return response;
      }
      throw error;
    }
  },
};

// const StartedInProgressReminderIntentHandler = {
//   canHandle(handlerInput) {
//     return handlerInput.requestEnvelope.request.type === "IntentRequest"
//       && handlerInput.requestEnvelope.request.intent.name === "AddNewPillIntent"
//       && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
//   },
//   handle(handlerInput) {
//     console.log("StartedInProgressReminderIntentHandler called");
//     return handlerInput.responseBuilder
//       .addDelegateDirective()
//       .getResponse();
//   }
// }

// const frequencyGivenRepeatHandler = {
//   canHandle(handlerInput) {
//     return handlerInput.requestEnvelope.request.type === "IntentRequest"
//       && handlerInput.requestEnvelope.request.intent.name === "AddNewPillIntent"
//       && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
//   }, handle(handlerInput) {
//     console.log("frequencyGivenRepeatHandler called");
//     return handlerInput.responseBuilder
//     .speak('Would you like this reminder to repeat daily or weekly?')
//     .reprompt('Would you like this reminder to repeat daily or weekly?')
//     .addElicitSlotDirective('frequency')
//     .getResponse();
//   }
// };

function httpGet(query, callback) {
  var options = {
      // host: 'numbersapi.com',
      // host: '/v1/alerts/reminders',
      // host: 'jsonplaceholder.typicode.com',
      // path: '/' + encodeURIComponent(query),
      // path: '/todos/1',
      host: '/',
      path: 'v1/alerts/reminders',
      method: 'GET',
  };

  var req = http.request(options, res => {
      res.setEncoding('utf8');
      var responseString = "";
      
      //accept incoming data asynchronously
      res.on('data', chunk => {
          responseString = responseString + chunk;
      });
      
      //return the data when streaming is complete
      res.on('end', () => {
          console.log(responseString);
          callback(responseString);
      });

  });
  req.end();
}

const frequencyGivenRepeatHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "AddNewPillIntent"
    && handlerInput.requestEnvelope.request.intent.slots.Color.value
    && handlerInput.requestEnvelope.request.intent.slots.date.value 
    && handlerInput.requestEnvelope.request.intent.slots.time.value
    && handlerInput.requestEnvelope.request.intent.slots.yesOrNo.value 
    && handlerInput.requestEnvelope.request.intent.slots.yesOrNo.value === "yes"
    && !handlerInput.requestEnvelope.request.intent.slots.frequency.value
    && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'
  }, handle(handlerInput) {
    console.log("frequencyGivenRepeatHandler called");
    return handlerInput.responseBuilder
    .speak('Would you like this to repeat daily, or weekly?')
    .reprompt('Would you like this to repeat daily, or weekly?')
    .addElicitSlotDirective('frequency')
    .getResponse();
  }
};

const dayGivenWeeklyFrequencyHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "AddNewPillIntent"
    && handlerInput.requestEnvelope.request.intent.slots.Color.value
    && handlerInput.requestEnvelope.request.intent.slots.date.value 
    && handlerInput.requestEnvelope.request.intent.slots.time.value
    && handlerInput.requestEnvelope.request.intent.slots.yesOrNo.value 
    && handlerInput.requestEnvelope.request.intent.slots.yesOrNo.value === "yes"
    && handlerInput.requestEnvelope.request.intent.slots.frequency.value === "weekly"
    && !handlerInput.requestEnvelope.request.intent.slots.day.value
    && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'
  }, handle(handlerInput) {
    console.log("dayGivenWeeklyFrequencyHandler called");
    return handlerInput.responseBuilder
    .speak('What days would you like this to repeat on?')
    .reprompt('What days would you like this to repeat on?')
    .addElicitSlotDirective('day')
    .getResponse();
  }
};


const AddNewPillHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AddNewPillIntent';
  },
  async handle(handlerInput) {
    // To call another handler
    // return AddRecurringReminderHandler.handle(handlerInput);

    const requestEnvelope = handlerInput.requestEnvelope;
    const responseBuilder = handlerInput.responseBuilder;
    const consentToken = requestEnvelope.context.System.apiAccessToken;
    const userId = handlerInput.requestEnvelope.session.user.userId.split(".")[3];

    console.log("handlerInput JSON stringify");
    console.log(JSON.stringify(handlerInput));

    console.log("Before extracting slot");
    console.log("handlerInput.requestEnvelope.request.intent:");
    console.log(handlerInput.requestEnvelope.request.intent)

    // check for confirmation.  if not confirmed, delegate
    switch (requestEnvelope.request.intent.confirmationStatus) {
      case 'CONFIRMED':
        // intent is confirmed, so continue
        console.log('Alexa confirmed intent, so clear to create reminder');
        break;
      case 'DENIED':
        // intent was explicitly not confirmed, so skip creating the reminder
        console.log('Alexa disconfirmed the intent; not creating reminder');
        return responseBuilder
          .speak(`${messages.NO_REMINDER} ${messages.WHAT_DO_YOU_WANT}`)
          .reprompt(messages.WHAT_DO_YOU_WANT)
          .getResponse();
      case 'NONE':
      default:
        console.log('delegate back to Alexa to get confirmation');
        return responseBuilder
          .addDelegateDirective()
          .getResponse();
    }

    if (!consentToken) {
      return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(PERMISSIONS)
        .getResponse();
    }
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    let prompt = '';
    var colorName = handlerInput.requestEnvelope.request.intent.slots.Color.value;
    var time = handlerInput.requestEnvelope.request.intent.slots.time.value;
    var date = handlerInput.requestEnvelope.request.intent.slots.date.value;

    // TODO: Only insert if the user has not yet scheduled for the same day

    // var params = {
    //   TableName: 'REMINDERS',
    //   Key: {
    //     'USER_ID': {S: userId}
    //   },
    //   // KeyConditionExpression: "#yr = :yyyy and title between :letter1 and :letter2",
    //   KeyConditionExpression: `SCHEDULED_DATE = :REMINDER_DATE`,
    //   ExpressionAttributeValues: {
    //     ":REMINDER_DATE": date,
    //     // ":letter1": "A",
    //     // ":letter2": "L"
    // }
    //   // ProjectionExpression: 'CUSTOMER_NAME'
    // };

    // let error_connecting_to_db = false;
    // // Call DynamoDB to read the item from the table
    // ddb.getItem(params, function(err, data) {
    //   if (err) {
    //     console.log("Error", err);
    //     error_connecting_to_db = true;
    //   } else {
    //     console.log("Success getting dynamodb item. JSON.stringify(data.Item):");
    //     console.log(JSON.stringify(data.Item));

    //     console.log("data.Item.SCHEDULED_DATETIME.S: " + data.Item.SCHEDULED_DATETIME.S);
    //     console.log("data.Item.REMINDER.S: " + data.Item.REMINDER.S);
    //   }
    // });

    // if (error_connecting_to_db) {
    //   return responseBuilder
    //   .speak('There was an error connecting to the database. Please try again.')
    //   .getResponse();
    // }



    /////////////////////////////////////////////////////////////////////////////////////////
    console.log("Inserting item into dynamodb");
    var params = {
      TableName: 'REMINDERS',
      Item: {
        'CREATED_UTC_TIMESTAMP': {S: `${new Date().valueOf()}`}, // unix timestamp
        'USER_ID' : {S: userId},
        'REMINDER': {S: colorName},
        'SCHEDULED_DATE': {S: date},
        'SCHEDULED_TIME': {S: `${time}:00.000`},
        'SCHEDULED_DATETIME': {S: `${date}T${time}:00.000`}
      }
    };
    
    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Record successfully inserted in database", data);
        // var params = {
        //   TableName: 'REMINDERS',
        //   Key: {
        //     'USER_ID': {S: userId}
        //   },
        //   // ProjectionExpression: 'CUSTOMER_NAME'
        // };
        var params = {
          TableName: 'REMINDERS',
          Key: {
            'USER_ID': {S: userId}
          },
          // KeyConditionExpression: "#yr = :yyyy and title between :letter1 and :letter2",
          KeyConditionExpression: `USER_ID= :USER_ID and SCHEDULED_DATE = :REMINDER_DATE`,
          ExpressionAttributeValues: {
            ":REMINDER_DATE": date,
            ":USER_ID": userId
            // ":letter1": "A",
            // ":letter2": "L"
        }
          // ProjectionExpression: 'CUSTOMER_NAME'
        };
    
        // Call DynamoDB to read the item from the table
        ddb.getItem(params, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            console.log("Success getting dynamodb item. JSON.stringify(data.Item):");
            console.log(JSON.stringify(data.Item));
    
            console.log("data.Item.SCHEDULED_DATETIME.S: " + data.Item.SCHEDULED_DATETIME.S);
            console.log("data.Item.REMINDER.S: " + data.Item.REMINDER.S);
          }
        });
      }
    });



    // TODO: Implement scenario of reminder(s) for multiple days but non-recurring

    var reminderText = `time to take your ${colorName} pill.`;
    
    try {
      const client = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
      var reminderRequests = Array();
      var reminderRequest = {};

      if (handlerInput.requestEnvelope.request.intent.slots.yesOrNo.value === "no") {
        reminderRequest = {
          trigger: {
            // type: 'SCHEDULED_RELATIVE',
            // offsetInSeconds: '30',
            type: 'SCHEDULED_ABSOLUTE',
            scheduledTime : `${date}T${time}:00.000`
          },
          alertInfo: {
            spokenInfo: {
              content: [{
                locale: 'en-US',
                text: reminderText
              }]
            }
          },
          pushNotification: {
            status: 'ENABLED'
          }
        };
        // add reminderRequest to reminderRequests array
        reminderRequests.push(reminderRequest);
      } else {
        reminderRequest = {
          trigger: {
            type: 'SCHEDULED_ABSOLUTE',
            scheduledTime : `${date}T${time}:00.000`,
            recurrence : {                     
              freq : handlerInput.requestEnvelope.request.intent.slots.frequency.value.toUpperCase()
            }
          },
          alertInfo: {
            spokenInfo: {
              content: [{
                locale: 'en-US',
                text: reminderText
              }]
            }
          },
          pushNotification: {
            status: 'ENABLED'
          }
        };

        // If recurrence is weekly, add the days of the week.
        if (reminderRequest.trigger.recurrence.freq === "DAILY") {
          reminderRequests.push(reminderRequest);
        }
        else if (reminderRequest.trigger.recurrence.freq === "WEEKLY") {
          var day_slot_values = handlerInput.requestEnvelope.request.intent.slots.day.value.toUpperCase()

          console.log("received day_slot_values");
          console.log(day_slot_values);
          
          // remove all commas and 'AND'
          day_slot_values = day_slot_values.replace(/,/g, ""); // all commas
          day_slot_values = day_slot_values.replace(/AND /gi, ""); // perform a global, case-insensitive replacement
          console.log("After removing commas and 'AND'");
          console.log(day_slot_values);

          // convert to array
          var days = day_slot_values.split(" ");

          var final_days = Array();

          for (let i = 0; i < days.length; i++) {
            // take the first 2 letters of the day
            let day = days[i].slice(0,2);
            final_days.push(day);
          }

          console.log("final_days array:");
          console.log(final_days);

          // Cannot create single reminderRequest for multiple days if weekly (see: https://forums.developer.amazon.com/questions/199059/setting-up-recurrent-reminders-unsupported-trigger.html)
          if (final_days.length === 1) {
            reminderRequest.trigger.recurrence.byDay = final_days;
            reminderRequests.push(reminderRequest);
          } else {
            // create multiple reminders for each day
            for (let i = 0; i < final_days.length; i++) {
              // deep copy reminderRequest object
              cloned_object = JSON.parse(JSON.stringify(reminderRequest));
              cloned_object.trigger.recurrence.byDay = Array(final_days[i]);
              reminderRequests.push(cloned_object);
            }
          }
          
          // reminderRequest.trigger.recurrence.byDay = ['MO', 'TU', 'WE'];
        }
      }

      // debug reminderRequests
      for (let j = 0; j < reminderRequests.length; j++) {
        console.log(`reminderRequests[${j}]:`);
        console.log(reminderRequests[j]);
      }

      // create reminders for all reminderRequests
      for (let i = 0; i < reminderRequests.length; i++) {
        try {
          const reminderResponse = await client.createReminder(reminderRequests[i]);
          console.log(JSON.stringify(reminderResponse));
        } catch (error) {
          console.log("there was an error: ");
          console.log(error.stack);
          if (error.name !== 'ServiceError') {
            console.log(`error: ${error.stack}`);
            const response = responseBuilder.speak(messages.ERROR).getResponse();
            return response;
          }
          throw error;
        }
      }

      // const reminderResponse = await client.createReminder(reminderRequest);
      // console.log(JSON.stringify(reminderResponse));

    } catch (error) {
      console.log("should never reach here");
      // console.log("there was an error: ");
      // console.log(error.stack);
      // if (error.name !== 'ServiceError') {
      //   console.log(`error: ${error.stack}`);
      //   const response = responseBuilder.speak(messages.ERROR).getResponse();
      //   return response;
      // }
      // throw error;
    }

    return responseBuilder
    .speak(messages.REMINDER_CREATED)
    .getResponse();

    // return responseBuilder
    // .speak("You said to add a " + colorName + " pill reminder at " + time + " on " + day)
    // .getResponse();
    // for (const slotName of Object.keys(handlerInput.requestEnvelope.request.intent.slots)) {
    //   const currentSlot = currentIntent.slots[slotName];

    // }


  }
};

const GetNextReminderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'GetNextReminderIntent';
  },
  async handle(handlerInput) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const responseBuilder = handlerInput.responseBuilder;
    const consentToken = requestEnvelope.context.System.apiAccessToken;

    if (!consentToken) {
      return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(PERMISSIONS)
        .getResponse();
    }

    let speech = null;

    try {
      const client = handlerInput.serviceClientFactory.getReminderManagementServiceClient();

      const allReminders = await client.getReminders();
      console.log("got all reminders");
      console.log(JSON.stringify(allReminders));

      const totalReminders = allReminders.totalCount; // string of integer
      const reminders = allReminders.alerts; // array

      // https://stackoverflow.com/questions/10123953/sort-javascript-object-array-by-date
      const sortedReminders = reminders.sort(function(a,b){
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(b.trigger.scheduledTime) - new Date(a.trigger.scheduledTime);
      });

      let weekday = new Array(7);
      weekday[0] = "Sunday";
      weekday[1] = "Monday";
      weekday[2] = "Tuesday";
      weekday[3] = "Wednesday";
      weekday[4] = "Thursday";
      weekday[5] = "Friday";
      weekday[6] = "Saturday";


      const scheduledDateTime = new Date(sortedReminders[0].trigger.scheduledTime)
      const day = weekday[scheduledDateTime.getDay()];
      // speech = {
      //   "outputSpeech": {
      //     "type": "SSML",
      //     "ssml": `<speak>Your next reminder is on ${day} at <say-as interpret-as="time">${scheduledDateTime.getTime}</say-as></speak>`
      //   }
      // };
      // const time = 

      speech = `Your next reminder is: ${sortedReminders[0].alertInfo.spokenInfo.content[0].text}, on ${day} at ${scheduledDateTime.getTime()}`;
      // speech = `<speak><say-as interpret-as="date">20190414</speak>`

    } catch (error) {
      console.log("ERROR GETTING ALL REMINDERS");
      console.log(error.stack);
    }

    // return {
    //   outputSpeech: "SSML",
    //   ssml: "<speak><say-as interpret-as=\"date\">20190414</say-as></speak>"
    // }
    return handlerInput.responseBuilder
    .speak(speech)
    .reprompt(speech)
    .getResponse();

  }
};

const AddRecurringReminderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AddRecurringReminderIntent';
  }, async handle(handlerInput) {
    console.log("AddRecurringReminderIntent called");
    return responseBuilder
    .speak("You asked to create a recurring reminder")
    .getResponse();
  }
};

const CreateReminderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'CreateReminderIntent';
  },
  async handle(handlerInput) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const responseBuilder = handlerInput.responseBuilder;
    const consentToken = requestEnvelope.context.System.apiAccessToken;

    // check for confirmation.  if not confirmed, delegate
    // switch (requestEnvelope.request.intent.confirmationStatus) {
    //   case 'CONFIRMED':
    //     // intent is confirmed, so continue
    //     console.log('Alexa confirmed intent, so clear to create reminder');
    //     break;
    //   case 'DENIED':
    //     // intent was explicitly not confirmed, so skip creating the reminder
    //     console.log('Alexa disconfirmed the intent; not creating reminder');
    //     return responseBuilder
    //       .speak(`${messages.NO_REMINDER} ${messages.WHAT_DO_YOU_WANT}`)
    //       .reprompt(messages.WHAT_DO_YOU_WANT)
    //       .getResponse();
    //   case 'NONE':
    //   default:
    //     console.log('delegate back to Alexa to get confirmation');
    //     return responseBuilder
    //       .addDelegateDirective()
    //       .getResponse();
    // }

    if (!consentToken) {
      return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(PERMISSIONS)
        .getResponse();
    }
    try {
      const client = handlerInput.serviceClientFactory.getReminderManagementServiceClient();

      const reminderRequest = {
        trigger: {
          type: 'SCHEDULED_RELATIVE',
          offsetInSeconds: '30',
        },
        alertInfo: {
          spokenInfo: {
            content: [{
              locale: 'en-US',
              text: 'time to get up and dance',
            }],
          },
        },
        pushNotification: {
          status: 'ENABLED',
        },
      };
      const reminderResponse = await client.createReminder(reminderRequest);
      console.log(JSON.stringify(reminderResponse));
    } catch (error) {
      if (error.name !== 'ServiceError') {
        console.log(`error: ${error.stack}`);
        const response = responseBuilder.speak(messages.ERROR).getResponse();
        return response;
      }
      throw error;
    }

    return responseBuilder
      .speak(messages.REMINDER_CREATED)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const UnhandledHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.UNHANDLED)
      .reprompt(messages.UNHANDLED)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.HELP)
      .reprompt(messages.HELP)
      .getResponse();
  },
};

const CancelStopHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.GOODBYE)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle(handlerInput, error) {
    return error.name === 'ServiceError';
  },
  handle(handlerInput, error) {
    // console.log(`ERROR STATUS: ${error.statusCode}`);
    console.log(`ERROR MESSAGE: ${error.message}`);
    console.log(`ERROR HANDLER: error status code: ${error.statusCode}`);
    console.log(`ERROR HANDLER: error stack: ${error.stack}`);
    // console.log(`ERROR RESPONSE: ${JSON.stringify(error.response)}`);
    // console.log(`ERROR STACK: ${error.stack}`);
    switch (error.statusCode) {
      case 401:
        return handlerInput.responseBuilder
          .speak(messages.NOTIFY_MISSING_PERMISSIONS)
          .withAskForPermissionsConsentCard(PERMISSIONS)
          .getResponse();
      case 403:
        return handlerInput.responseBuilder
          .speak(`${messages.UNSUPPORTED_DEVICE} ${messages.WHAT_DO_YOU_WANT}`)
          .reprompt(messages.WHAT_DO_YOU_WANT)
          .getResponse();
      default:
        return handlerInput.responseBuilder
          .speak(messages.API_FAILURE)
          .getResponse();
    }
  },
};

const RequestLog = {
  async process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const ResponseLog = {
  process(handlerInput) {
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    CreateReminderHandler,
    // StartedInProgressReminderIntentHandler,
    dayGivenWeeklyFrequencyHandler,
    frequencyGivenRepeatHandler,
    AddNewPillHandler,
    GetNextReminderHandler,
    AddRecurringReminderHandler,
    SessionEndedRequestHandler,
    HelpHandler,
    CancelStopHandler,
    UnhandledHandler,
  )
  .addRequestInterceptors(RequestLog)
  .addResponseInterceptors(ResponseLog)
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .withCustomUserAgent('cookbook/reminders/v1')
  .lambda();