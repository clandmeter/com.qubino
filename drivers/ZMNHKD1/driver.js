'use strict';

const path = require('path');
const ZwaveDriver = require('homey-zwavedriver');

// Documentation: http://qubino.com/download/1071/

module.exports = new ZwaveDriver(path.basename(__dirname), {
	capabilities: {
		custom_thermostat_mode: {
			command_class: 'COMMAND_CLASS_THERMOSTAT_MODE',
			command_get: 'THERMOSTAT_MODE_GET',
			command_set: 'THERMOSTAT_MODE_SET',
			command_set_parser: mode => ({
				'Level': {
					'Mode': (mode === 'off') ? 'Off' : 'Auto',
				},
			}),
			command_report: 'THERMOSTAT_MODE_REPORT',
			command_report_parser: report => {
				if (report && report.hasOwnProperty('Level') &&
					report['Level'].hasOwnProperty('Mode') &&
					typeof report['Level']['Mode'] !== 'undefined') {
					return report['Level']['Mode'].toLowerCase();
				}
				return null;
			},
		},
		target_temperature: {
			command_class: 'COMMAND_CLASS_THERMOSTAT_SETPOINT',
			command_get: 'THERMOSTAT_SETPOINT_GET',
			command_get_parser: () => ({
				'Level': {
					'Setpoint Type': 'Heating 1',
				}
			}),
			command_set: 'THERMOSTAT_SETPOINT_SET',
			command_set_parser: (value) => {

				// Create value buffer
				const a = new Buffer(2);
				a.writeUInt16BE((Math.round(value * 2) / 2 * 10).toFixed(0));

				return {
					'Level': {
						'Setpoint Type': 'Heating 1'
					},
					'Level2': {
						'Size': 2,
						'Scale': 0,
						'Precision': 1
					},
					'Value': a
				};
			},
			command_report: 'THERMOSTAT_SETPOINT_REPORT',
			command_report_parser: report => {
				if (report.hasOwnProperty('Level2')
					&& report.Level2.hasOwnProperty('Scale')
					&& report.Level2.hasOwnProperty('Precision')
					&& report.Level2['Scale'] === 0
					&& report.Level2['Size'] !== 'undefined'
					&& typeof report['Value'].readUIntBE(0, report.Level2['Size']) !== 'undefined') {
					return report['Value'].readUIntBE(0, report.Level2['Size']) / Math.pow(10, report.Level2['Precision']);
				}
				return null;
			},
		},
		measure_temperature: {
			command_class: 'COMMAND_CLASS_SENSOR_MULTILEVEL',
			command_get: 'SENSOR_MULTILEVEL_GET',
			command_get_parser: () => ({
				'Sensor Type': 'Temperature (version 1)',
				Properties1: {
					Scale: 0,
				},
			}),
			command_report: 'SENSOR_MULTILEVEL_REPORT',
			command_report_parser: report => report['Sensor Value (Parsed)'],
			optional: true,
		},
	},
	settings: {
		input_1_type: {
			index: 1,
			size: 1,
		},
		input_2_type: {
			index: 2,
			size: 1,
		},
		input_1_contact_type: {
			index: 3,
			size: 1,
		},
		input_2_contact_type: {
			index: 4,
			size: 1,
		},
		input_1_status_on_delay: {
			index: 5,
			size: 2,
		},
		input_2_status_on_delay: {
			index: 7,
			size: 2,
		},
		input_1_status_off_delay: {
			index: 6,
			size: 2,
		},
		input_2_status_off_delay: {
			index: 8,
			size: 2,
		},
		input_1_functionality_selection: {
			index: 11,
			size: 2,
		},
		input_2_functionality_selection: {
			index: 12,
			size: 2,
		},
		power_report_on_power_change_q1: {
			index: 40,
			size: 1,
		},
		power_report_on_power_change_q2: {
			index: 41,
			size: 1,
		},
		power_report_by_time_interval_q1: {
			index: 42,
			size: 2,
		},
		power_report_by_time_interval_q2: {
			index: 43,
			size: 2,
		},
		temperature_hysteresis_heating_on: {
			index: 50,
			size: 1,
		},
		temperature_hysteresis_heating_off: {
			index: 51,
			size: 1,
		},
		temperature_hysteresis_cooling_on: {
			index: 52,
			size: 1,
		},
		temperature_hysteresis_cooling_off: {
			index: 53,
			size: 1,
		},
		antifreeze: {
			index: 54,
			size: 1,
		},
		too_low_temperature_limit: {
			index: 60,
			size: 2,
		},
		too_high_temperature_limit: {
			index: 61,
			size: 2,
		},
		output_switch_selection_q1: {
			index: 64,
			size: 1,
		},
		output_switch_selection_q2: {
			index: 65,
			size: 1,
		},
	},
});

module.exports.on('initNode', token => {
	const node = module.exports.nodes[token];

	if (node) {

		// I2 switched
		if (node.instance.MultiChannelNodes['1'] && node.instance.MultiChannelNodes['1'].CommandClass.COMMAND_CLASS_SENSOR_BINARY) {
			node.instance.MultiChannelNodes['1'].CommandClass.COMMAND_CLASS_SENSOR_BINARY.on('report', (command, report) => {
				if (command.name === 'SENSOR_BINARY_REPORT') {
					if (report['Sensor Value'] === 'detected an event') {
						Homey.manager('flow').triggerDevice('ZMNHKD1_I2_on', {}, {}, node.device_data);
					} else if (report['Sensor Value'] === 'idle') {
						Homey.manager('flow').triggerDevice('ZMNHKD1_I2_off', {}, {}, node.device_data);
					}
				}
			});
		}

		// I3 switched
		if (node.instance.MultiChannelNodes['2'] && node.instance.MultiChannelNodes['2'].CommandClass.COMMAND_CLASS_SENSOR_BINARY) {
			node.instance.MultiChannelNodes['2'].CommandClass.COMMAND_CLASS_SENSOR_BINARY.on('report', (command, report) => {
				if (command.name === 'SENSOR_BINARY_REPORT') {
					if (report['Sensor Value'] === 'detected an event') {
						Homey.manager('flow').triggerDevice('ZMNHKD1_I3_on', {}, {}, node.device_data);
					} else if (report['Sensor Value'] === 'idle') {
						Homey.manager('flow').triggerDevice('ZMNHKD1_I3_off', {}, {}, node.device_data);
					}
				}
			});
		}
	}
});
