'use strict';

const when = require('when');
const async = require('async');
const iotClient = require('ibmiotf');

class IoTPlatformClient {

  constructor(id, iotfCredentials) {
    const appClientConfig = {
      id: id,
      type: iotfCredentials.type,
      domain: iotfCredentials.domain,
      org: iotfCredentials.org,
      'auth-key': iotfCredentials.apiKey,
      'auth-token': iotfCredentials.apiToken
    };
    this.iotfAppClient = new iotClient.IotfApplication(appClientConfig);
  }

  connect() {
    const method = 'IoTPlatformClient.connect';
    return when.promise((resolve, reject) => {
      try {
        this.iotfAppClient.connect();
        this.iotfAppClient.on('connect', () => {
          console.info('Connection to IoTPlatform is established.');
          resolve();
        });
        this.iotfAppClient.on('error', (err) => {
          console.error('IoTP uncaught error:', err);
          reject(err);
        });
      } catch(err) {
        console.error('IoT connect failed with error:', err);
        reject(err);
      }
    });
  }

  disconnect() {
    const method = 'IoTPlatformClient.disconnect';
    try {
      this.iotfAppClient.disconnect();
    } catch(err) {
      console.error('Error at during disconnect from IoTPlatform', err);
    }
  }

  publishDeviceEvent(deviceType, deviceId, eventType, eventFormat, payload) {
    const method = 'IoTPlatformClient.publishDeviceEvent';
    try {
      this.iotfAppClient.publishDeviceEvent(deviceType, deviceId, eventType, eventFormat, payload);
    } catch(err) {
      console.error('Error while publishing an event for user', deviceId, 'with error', err);
    }
  }

  publishDeviceCommand(deviceType, deviceId, commandType, formatType, data, qos) {
    const method = 'IoTPlatformClient.publishDeviceCommand';
    try {
      this.iotfAppClient.publishDeviceCommand(deviceType, deviceId, commandType, formatType, data, qos);
    } catch(err) {
      console.error('Error while publishing an event for user', deviceId, 'with error', err);
    }
  }

  sendEvents(iotpUserEvents) {
    const method = 'IoTPlatformClient.sendEvents';
    return when.promise((resolve, reject) => {
      async.each(iotpUserEvents, (userEvents, asyncCallback) => {
        console.info('Notify IoTP with',
          userEvents.devices.length, 'events for user', userEvents.username);
        this.notifyIoTP(userEvents.devices, userEvents.username).then(() => {
          asyncCallback();
        }).catch(() => {
          // continue if one user's events failed to be sent to IoTP
          asyncCallback();
        });
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          // sending events to IoTP completed
          resolve();
        }
      });
    });
  }

  subscribeToEvents() {
    const method = 'IoTPlatformClient.subscribeToEvents';
    console.info('Subscribing to events.');
    return when.promise((resolve, reject) => {
      try {
        this.iotfAppClient.subscribeToDeviceEvents();
        resolve();
      } catch(err) {
        console.error('Error while subscribing to events.', err);
        reject(err);
      }
    });
  }

  subscribeToDeviceEvents(deviceType, deviceId, event, format, qos) {
    const method = 'IoTPlatformClient.subscribeToDeviceEvents';
    console.info('Subscribing to device events:', event);
    return when.promise((resolve, reject) => {
      try {
        this.iotfAppClient.subscribeToDeviceEvents(deviceType, deviceId, event, format);
        resolve();
      } catch(err) {
        console.error('Error subscribing to device events:', event, err);
        reject(err);
      }
    });
  }

  subscribeToDeviceCommands(deviceType, deviceId, command, format, qos) {
    const method = 'IoTPlatformClient.subscribeToDeviceCommands';
    console.info('Subscribing to device commands:', command);
    return when.promise((resolve, reject) => {
      try {
        this.iotfAppClient.subscribeToDeviceCommands(deviceType, deviceId, command, format);
        resolve();
      } catch(err) {
        console.error('Error while subscribing to device commands', command, err);
        reject(err);
      }
    });
  }

  processDeviceEvents(informSubscriber) {
    this.iotfAppClient.on('deviceEvent', (deviceType, deviceId, eventType, format, payload) => {
      informSubscriber(deviceType, deviceId, eventType, format, payload);
    });
  }

  processDeviceCommands(informSubscriber) {
    this.iotfAppClient.on('deviceCommand', (deviceType, deviceId, commandType, formatType, rawPayload, topic) => {
      informSubscriber(deviceType, deviceId, commandType, formatType, rawPayload, topic);
    });
  }

  notifyIoTP(iotUserDevices, userName) {
    const method = 'IoTPlatformClient.notifyIoTP';
    return when.promise((resolve, reject) => {
      if (iotUserDevices.length > 0) {
        async.each(iotUserDevices, (iotDevice, asyncCallback) => {
          try {
            this.iotfAppClient.publishDeviceEvent(iotDevice.deviceType, userName,
              'status', 'json', JSON.stringify(iotDevice));
            asyncCallback();
          } catch(err) {
            console.error('IoT publish failed for user', userName, 'with error', err);
            asyncCallback(err);
          }
        }, (err) => {
          if (err) {
            console.error('IoT notification failed with err', err);
            reject(err);
          } else {
            console.error('All IoT notifications sent', err);
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

IoTPlatformClient.getInstance = function(logger, id, iotfCredentials) {
  return new IoTPlatformClient(logger, id, iotfCredentials);
};

module.exports = IoTPlatformClient;
