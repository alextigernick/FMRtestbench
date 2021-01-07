from qdinstrument import QDInstrument


class QDCommandParser:

    def __init__(self, instrument_type, line_term='\r\n'):
        self.cmd_list = {'TEMP': (self.set_temperature, self.get_temperature),
                         'FIELD': (self.set_field, self.get_field),
                         'CHAMBER': (self.set_chamber, self.get_chamber),
                         'POS': (self.set_all, self.get_all)
						 'ALL': (self.set_all, self.get_all)}
        self._instrument = QDInstrument(instrument_type)
        self._line_term = line_term

    def parse_cmd(self, data):
        cmd = data.split(' ')[0]
        for test_cmd in self.cmd_list:
            if cmd.find(test_cmd) == 0:
                if cmd.find(test_cmd + '?') == 0:
                    return str(self.cmd_list[test_cmd][1]()) + self._line_term
                else:
                    try:
                        cmd, arg_string = data.split(' ', 1)
                    except:
                        return 'No argument(s) given for command {0}.'.format(test_cmd) + self._line_term
                    return str(self.cmd_list[test_cmd][0](arg_string)) + self._line_term
        return 'Unknown command: {0}.'.format(data) + self._line_term

    def get_all(self):
        retT = self._instrument.get_temperature()
        retF = self._instrument.get_field()
        retC = self._instrument.get_chamber()
        retR = self._instrument.get_position()
        return "ALL?, {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}".format(*(retT+retF+retC+retR))
        
    def set_all(self,arg_string):
        print("set all not implemented. ARGS: " +arg_string)
        return "Set all not implemented."
		
	def get_rotator(self):
	    rp = self._instrument.get_position()
	    return "POS?, {0}, {1}, {2}".format(*rp) 
	def set_rotator(self,arg_string):
	    try:
	        pos,speed = arg_string.split(",")
	        pos = float(pos)
	        speed = float(speed)
	        err = self._instrument.set_position(pos,speed)
	        return "POS, {0}".format(err)
        except:
            return "Argument Error in rotator Command"
    def get_temperature(self):
        ret = self._instrument.get_temperature()
        return 'TEMP?, {0}, {1}, {2}'.format(*ret)

    def set_temperature(self, arg_string):
        try:
            temperature, rate, mode = arg_string.split(',')
            temperature = float(temperature)
            rate = float(rate)
            mode = int(mode)
            err = self._instrument.set_temperature(temperature, rate, mode)
            return "TEMP, " + err
        except:
            return 'Argument error in TEMP command.'

    def get_field(self):
        ret = self._instrument.get_field()
        return 'FIELD?, {0}, {1}, {2}'.format(*ret)

    def set_field(self, arg_string):
        try:
            field, rate, approach, mode = arg_string.split(',')
            field = float(field)
            rate = float(rate)
            approach = int(approach)
            mode = int(mode)
            err = self._instrument.set_field(field, rate, approach, mode)
            return "TEMP, " + err
        except:
            return 'Argument error in FIELD command.'

    def get_chamber(self):
        ret = self._instrument.get_chamber()
        return 'CHAMBER?, {0}, {1}'.format(*ret)

    def set_chamber(self, arg_string):
        try:
            code = arg_string
            code = int(code)
            err = self._instrument.set_chamber(code)
            return "CHAMBER, " + err
        except:
            return 'Argument error in CHAMBER command'
