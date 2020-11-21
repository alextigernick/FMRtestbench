class Instrument {
    constructor(name) {
      this._name = name;
      this.connected = false;
    }
    poll() { }
  }
module.exports = Instrument;

