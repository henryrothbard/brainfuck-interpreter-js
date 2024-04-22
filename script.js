// I LOVE OOP!!!!!!

class UI {
    static elements = ((e) => {let r = {}; e.forEach(i => r[i] = document.getElementById(i)); return r;})([
        "envBtn",
        "envTxt",
        "toolBtn0",
        "toolBtn1",
        "toolBtn2",
        "panel1",
        "panel2",
        "inputPanel",
        "outputPanel",
        "staticOutput",
        "editableOutput",
    ]);
    
    static envStates = {
        0: ["--svg: var(--env-off-icon); color: hsl(0, 100%, 40%);", "Unavailable"],
        1: ["--svg: var(--env-empty-icon); color: hsl(120, 100%, 40%);", "Blank"],
        2: ["--svg: var(--env-full-icon); color: hsl(120, 100%, 40%);", "Full"],
        3: ["--svg: var(--env-paused-icon); color: hsl(40, 100%, 40%);", "Paused"],
        4: ["--svg: var(--env-waiting-icon); color: hsl(40, 100%, 40%);", "Waiting"],
        5: ["--svg: var(--env-running-icon); color: hsl(40, 100%, 40%); animation: spin 1s infinite;", "Running"],
    };

    constructor() {
        this.setState(0);
        this.panelFocus = 0; // 0: input panel, 1: output panel
        this.outputType = 0;
        UI.elements.outputPanel.addEventListener("click", (e) => UI.elements.editableOutput.focus())
        const collapseMQ = window.matchMedia("(max-width: 768px)");
        const layoutFunc = ((e) => e.matches ? this.collapse() : this.expand()).bind(this);
        layoutFunc(collapseMQ);
        collapseMQ.addEventListener("change", layoutFunc);
    }

    collapse() {
        UI.elements.panel1.appendChild(UI.elements.outputPanel);
        (this.panelFocus ? UI.elements.inputPanel : UI.elements.outputPanel).style = "display: none;"
    }

    expand() {
        UI.elements.panel2.appendChild(UI.elements.outputPanel);
        UI.elements.outputPanel.style = "";
        UI.elements.inputPanel.style = "";
    }

    updateEnvBtn(state) {
        [UI.elements.envBtn.style, UI.elements.envTxt.innerHTML] =
        UI.envStates[state] || UI.envStates[0];
    }

    updateToolBtns(state) {
        UI.elements.toolBtn0.style = "--svg: var(--reset-icon)";
        UI.elements.toolBtn1.style = "--svg: var(--play-icon)";
        UI.elements.toolBtn2.style = "--svg: var(--step-icon)";
        if (state >= 3) UI.elements.toolBtn0.style = "--svg: var(--stop-icon)";
        if (state >= 4) UI.elements.toolBtn1.style = "--svg: var(--pause-icon)";
    }

    setState(state) {
        this.updateEnvBtn(state);
        this.updateToolBtns(state);
    }

    updateOutput(outputs) {

    }
}

class BFEnv {
    static tapeTypes = {
        0: Uint8Array,
        1: Int8Array,
        2: Uint16Array,
        3: Int16Array, 
        // Wanted to use Int32 but "[-]" would run in unreasonable time O(2^n)
    };

    constructor() {
        this.setState(0);
        this.messageTypes = {
            state: this.setState.bind(this),
            input: () => {},
            output: () => {},
        };
        this.init(0);
    }

    init(tapeType) {
        if (!this.worker) {
            this.worker = new Worker("worker.js");
            this.worker.onmessage = ({data: {type, data}}) => {console.log({type, data}); this.messageTypes[type](data);};
        }
        this.tapeType = tapeType;
        this.buffer = new SharedArrayBuffer((1*30000)+12);
        this.flag = new Int32Array(this.buffer, 0, 1);
        this.pointers = new Uint32Array(this.buffer, 4, 2);
        this.tape = new (BFEnv.tapeTypes[tapeType] || Uint8Array)(this.buffer, 12);
        this.outputs = [];
        this.worker.postMessage({type: "init", data: {tapeType: tapeType, buffer: this.buffer}});
    }

    setState(state) {
        this.state = state;
        ui.setState(state);
    }

    executeAll() {
        Atomics.store(this.flag, 0, 0);
        this.continueAfterInput = true;
        this.worker.postMessage({type: "run"});
    }

    step() {
        Atomics.store(this.flag, 0, 0);
        this.continueAfterInput = false;
        this.worker.postMessage({type: "step"});
    }

    resetInsPtr() {
        this.worker.postMessage({type: "resetInsPtr"});
    }

    pause() {
        Atomics.store(this.flag, 0, 1);
        this.setState(3)
    }

    stop() {
        this.pause();
        this.resetInsPtr();
    }

    shutdown() {
        this.worker.terminate();
        this.worker = null;
        this.setState(0);
    }

    sendScript(script) {
        this.worker.postMessage({type: "setScript", data: script});
    }
}

const ui = new UI();
const bfe = new BFEnv();


// -- Unused --
// states = {
//     off: 0,  // BFI is unavailabe or turned off
//     empty: 1,  // BFI is blank and contains no data
//     full: 2,  // BFI has data in the tape and tape pointer but instruction pointer is set to 0
//     paused: 3,  // BFI is paused
//     waiting: 4,  // BFI is waiting for input for ',' command
//     running: 5,  // BFI is running
// };