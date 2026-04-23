<script lang="ts">
    import { ui } from "./state.svelte";

    let { onclose }: { onclose: () => void } = $props();

    let panel = $state<HTMLDivElement>();
    let dragging = $state(false);
    let dragOffset = { x: 0, y: 0 };

    function onMouseDown(e: MouseEvent) {
        if ((e.target as HTMLElement).closest(".close-btn")) return;
        dragging = true;
        const rect = panel!.getBoundingClientRect();
        dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        e.preventDefault();
    }

    function onMouseMove(e: MouseEvent) {
        if (!dragging || !panel) return;
        panel.style.left = `${e.clientX - dragOffset.x}px`;
        panel.style.top = `${e.clientY - dragOffset.y}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }

    function onMouseUp() {
        dragging = false;
    }

    // Build cell index for opcode highlighting
    let cells = $state<HTMLElement[]>([]);

    function indexCells(el: HTMLDivElement) {
        const items = el.querySelectorAll("i");
        cells = Array.from(items).map((i) => i.parentElement!);
    }

    $effect(() => {
        if (panel) indexCells(panel);
    });

    let lastHit = -1;

    $effect(() => {
        const opcode = ui.visualizerOpcode;
        if (cells.length === 0) return;
        if (lastHit >= 0 && cells[lastHit]) cells[lastHit].classList.remove("active");
        if (opcode >= 0 && cells[opcode]) cells[opcode].classList.add("active");
        lastHit = opcode;
    });
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="visualizer" bind:this={panel} onmousedown={onMouseDown}>
    <div class="titlebar">
        <span>Intel 8080</span>
        <button class="close-btn" type="button" onclick={onclose}>&times;</button>
    </div>
    <table>
        <thead>
            <tr>
                <td></td>
                <td>x0</td><td>x1</td><td>x2</td><td>x3</td><td>x4</td><td>x5</td><td>x6</td><td>x7</td>
                <td>x8</td><td>x9</td><td>xA</td><td>xB</td><td>xC</td><td>xD</td><td>xE</td><td>xF</td>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>0x</td>
                <td class="nop"><i>NOP</i></td>
                <td class="mem16"><i>LXI</i>B,d16</td>
                <td class="mem"><i>STAX</i>B</td>
                <td class="alu16"><i>DCR</i>B</td>
                <td class="alu"><i>INR</i>B</td>
                <td class="alu"><i>DCR</i>B</td>
                <td class="mem"><i>MVI</i>B,d8</td>
                <td class="alu"><i>RLC</i></td>
                <td class="nop"><i>*NOP</i></td>
                <td class="alu16"><i>DAD</i>B</td>
                <td class="mem"><i>LDAX</i>B</td>
                <td class="alu16"><i>DCR</i>B</td>
                <td class="alu"><i>INR</i>C</td>
                <td class="alu"><i>DCR</i>C</td>
                <td class="mem"><i>MVI</i>C,d8</td>
                <td class="alu"><i>RRC</i></td>
            </tr>
            <tr>
                <td>1x</td>
                <td class="nop"><i>*NOP</i></td>
                <td class="mem16"><i>LXI</i>D,d16</td>
                <td class="mem"><i>STAX</i>D</td>
                <td class="alu16"><i>DCR</i>D</td>
                <td class="alu"><i>INR</i>D</td>
                <td class="alu"><i>DCR</i>D</td>
                <td class="mem"><i>MVI</i>D,d8</td>
                <td class="alu"><i>RAL</i></td>
                <td class="nop"><i>*NOP</i></td>
                <td class="alu16"><i>DAD</i>D</td>
                <td class="mem"><i>LDAX</i>D</td>
                <td class="alu16"><i>DCR</i>D</td>
                <td class="alu"><i>INR</i>E</td>
                <td class="alu"><i>DCR</i>E</td>
                <td class="mem"><i>MVI</i>E,d8</td>
                <td class="alu"><i>RAR</i></td>
            </tr>
            <tr>
                <td>2x</td>
                <td class="nop"><i>*NOP</i></td>
                <td class="mem16"><i>LXI</i>H,d16</td>
                <td class="mem16"><i>SHLD</i>a16</td>
                <td class="alu16"><i>DCR</i>H</td>
                <td class="alu"><i>INR</i>H</td>
                <td class="alu"><i>DCR</i>H</td>
                <td class="mem"><i>MVI</i>H,d8</td>
                <td class="alu"><i>DAA</i></td>
                <td class="nop"><i>*NOP</i></td>
                <td class="alu16"><i>DAD</i>H</td>
                <td class="mem16"><i>LHLD</i>a16</td>
                <td class="alu16"><i>DCR</i>H</td>
                <td class="alu"><i>INR</i>L</td>
                <td class="alu"><i>DCR</i>L</td>
                <td class="mem"><i>MVI</i>L,d8</td>
                <td class="alu"><i>CMA</i></td>
            </tr>
            <tr>
                <td>3x</td>
                <td class="nop"><i>*NOP</i></td>
                <td class="mem16"><i>LXI</i>SP,d16</td>
                <td class="mem"><i>STA</i>a16</td>
                <td class="alu16"><i>DCR</i>SP</td>
                <td class="alu"><i>INR</i>M</td>
                <td class="alu"><i>DCR</i>M</td>
                <td class="mem"><i>MVI</i>M,d8</td>
                <td class="alu"><i>STC</i></td>
                <td class="nop"><i>*NOP</i></td>
                <td class="alu16"><i>DAD</i>SP</td>
                <td class="mem"><i>LDA</i>a16</td>
                <td class="alu16"><i>DCR</i>SP</td>
                <td class="alu"><i>INR</i>A</td>
                <td class="alu"><i>DCR</i>A</td>
                <td class="mem"><i>MVI</i>A,d8</td>
                <td class="alu"><i>CMC</i></td>
            </tr>
            <tr>
                <td>4x</td>
                <td class="mem"><i>MOV</i>B,B</td>
                <td class="mem"><i>MOV</i>B,C</td>
                <td class="mem"><i>MOV</i>B,D</td>
                <td class="mem"><i>MOV</i>B,E</td>
                <td class="mem"><i>MOV</i>B,H</td>
                <td class="mem"><i>MOV</i>B,L</td>
                <td class="mem"><i>MOV</i>B,M</td>
                <td class="mem"><i>MOV</i>B,A</td>
                <td class="mem"><i>MOV</i>C,B</td>
                <td class="mem"><i>MOV</i>C,C</td>
                <td class="mem"><i>MOV</i>C,D</td>
                <td class="mem"><i>MOV</i>C,E</td>
                <td class="mem"><i>MOV</i>C,H</td>
                <td class="mem"><i>MOV</i>C,L</td>
                <td class="mem"><i>MOV</i>C,M</td>
                <td class="mem"><i>MOV</i>C,A</td>
            </tr>
            <tr>
                <td>5x</td>
                <td class="mem"><i>MOV</i>D,B</td>
                <td class="mem"><i>MOV</i>D,C</td>
                <td class="mem"><i>MOV</i>D,D</td>
                <td class="mem"><i>MOV</i>D,E</td>
                <td class="mem"><i>MOV</i>D,H</td>
                <td class="mem"><i>MOV</i>D,L</td>
                <td class="mem"><i>MOV</i>D,M</td>
                <td class="mem"><i>MOV</i>D,A</td>
                <td class="mem"><i>MOV</i>E,B</td>
                <td class="mem"><i>MOV</i>E,C</td>
                <td class="mem"><i>MOV</i>E,D</td>
                <td class="mem"><i>MOV</i>E,E</td>
                <td class="mem"><i>MOV</i>E,H</td>
                <td class="mem"><i>MOV</i>E,L</td>
                <td class="mem"><i>MOV</i>E,M</td>
                <td class="mem"><i>MOV</i>E,A</td>
            </tr>
            <tr>
                <td>6x</td>
                <td class="mem"><i>MOV</i>H,B</td>
                <td class="mem"><i>MOV</i>H,C</td>
                <td class="mem"><i>MOV</i>H,D</td>
                <td class="mem"><i>MOV</i>H,E</td>
                <td class="mem"><i>MOV</i>H,H</td>
                <td class="mem"><i>MOV</i>H,L</td>
                <td class="mem"><i>MOV</i>H,M</td>
                <td class="mem"><i>MOV</i>H,A</td>
                <td class="mem"><i>MOV</i>L,B</td>
                <td class="mem"><i>MOV</i>L,C</td>
                <td class="mem"><i>MOV</i>L,D</td>
                <td class="mem"><i>MOV</i>L,E</td>
                <td class="mem"><i>MOV</i>L,H</td>
                <td class="mem"><i>MOV</i>L,L</td>
                <td class="mem"><i>MOV</i>L,M</td>
                <td class="mem"><i>MOV</i>L,A</td>
            </tr>
            <tr>
                <td>7x</td>
                <td class="mem"><i>MOV</i>M,B</td>
                <td class="mem"><i>MOV</i>M,C</td>
                <td class="mem"><i>MOV</i>M,D</td>
                <td class="mem"><i>MOV</i>M,E</td>
                <td class="mem"><i>MOV</i>M,H</td>
                <td class="mem"><i>MOV</i>M,L</td>
                <td class="hlt"><i>HLT</i></td>
                <td class="mem"><i>MOV</i>M,A</td>
                <td class="mem"><i>MOV</i>A,B</td>
                <td class="mem"><i>MOV</i>A,C</td>
                <td class="mem"><i>MOV</i>A,D</td>
                <td class="mem"><i>MOV</i>A,E</td>
                <td class="mem"><i>MOV</i>A,H</td>
                <td class="mem"><i>MOV</i>A,L</td>
                <td class="mem"><i>MOV</i>A,M</td>
                <td class="mem"><i>MOV</i>A,A</td>
            </tr>
            <tr>
                <td>8x</td>
                <td class="alu"><i>ADD</i>B</td>
                <td class="alu"><i>ADD</i>C</td>
                <td class="alu"><i>ADD</i>D</td>
                <td class="alu"><i>ADD</i>E</td>
                <td class="alu"><i>ADD</i>H</td>
                <td class="alu"><i>ADD</i>L</td>
                <td class="alu"><i>ADD</i>M</td>
                <td class="alu"><i>ADD</i>A</td>
                <td class="alu"><i>ADC</i>B</td>
                <td class="alu"><i>ADC</i>C</td>
                <td class="alu"><i>ADC</i>D</td>
                <td class="alu"><i>ADC</i>E</td>
                <td class="alu"><i>ADC</i>H</td>
                <td class="alu"><i>ADC</i>L</td>
                <td class="alu"><i>ADC</i>M</td>
                <td class="alu"><i>ADC</i>A</td>
            </tr>
            <tr>
                <td>9x</td>
                <td class="alu"><i>SUB</i>B</td>
                <td class="alu"><i>SUB</i>C</td>
                <td class="alu"><i>SUB</i>D</td>
                <td class="alu"><i>SUB</i>E</td>
                <td class="alu"><i>SUB</i>H</td>
                <td class="alu"><i>SUB</i>L</td>
                <td class="alu"><i>SUB</i>M</td>
                <td class="alu"><i>SUB</i>A</td>
                <td class="alu"><i>SBB</i>B</td>
                <td class="alu"><i>SBB</i>C</td>
                <td class="alu"><i>SBB</i>D</td>
                <td class="alu"><i>SBB</i>E</td>
                <td class="alu"><i>SBB</i>H</td>
                <td class="alu"><i>SBB</i>L</td>
                <td class="alu"><i>SBB</i>M</td>
                <td class="alu"><i>SBB</i>A</td>
            </tr>
            <tr>
                <td>Ax</td>
                <td class="alu"><i>ANA</i>B</td>
                <td class="alu"><i>ANA</i>C</td>
                <td class="alu"><i>ANA</i>D</td>
                <td class="alu"><i>ANA</i>E</td>
                <td class="alu"><i>ANA</i>H</td>
                <td class="alu"><i>ANA</i>L</td>
                <td class="alu"><i>ANA</i>M</td>
                <td class="alu"><i>ANA</i>A</td>
                <td class="alu"><i>XRA</i>B</td>
                <td class="alu"><i>XRA</i>C</td>
                <td class="alu"><i>XRA</i>D</td>
                <td class="alu"><i>XRA</i>E</td>
                <td class="alu"><i>XRA</i>H</td>
                <td class="alu"><i>XRA</i>L</td>
                <td class="alu"><i>XRA</i>M</td>
                <td class="alu"><i>XRA</i>A</td>
            </tr>
            <tr>
                <td>Bx</td>
                <td class="alu"><i>ORA</i>B</td>
                <td class="alu"><i>ORA</i>C</td>
                <td class="alu"><i>ORA</i>D</td>
                <td class="alu"><i>ORA</i>E</td>
                <td class="alu"><i>ORA</i>H</td>
                <td class="alu"><i>ORA</i>L</td>
                <td class="alu"><i>ORA</i>M</td>
                <td class="alu"><i>ORA</i>A</td>
                <td class="alu"><i>CMP</i>B</td>
                <td class="alu"><i>CMP</i>C</td>
                <td class="alu"><i>CMP</i>D</td>
                <td class="alu"><i>CMP</i>E</td>
                <td class="alu"><i>CMP</i>H</td>
                <td class="alu"><i>CMP</i>L</td>
                <td class="alu"><i>CMP</i>M</td>
                <td class="alu"><i>CMP</i>A</td>
            </tr>
            <tr>
                <td>Cx</td>
                <td class="jmp"><i>RNZ</i></td>
                <td class="mem16"><i>POP</i>B</td>
                <td class="jmp"><i>JNZ</i>a16</td>
                <td class="jmp"><i>JMP</i>a16</td>
                <td class="jmp"><i>CNZ</i>a16</td>
                <td class="mem16"><i>PUSH</i>B</td>
                <td class="alu"><i>ADI</i>d8</td>
                <td class="jmp"><i>RST</i>0</td>
                <td class="jmp"><i>RZ</i></td>
                <td class="jmp"><i>RET</i></td>
                <td class="jmp"><i>JZ</i>a16</td>
                <td class="jmp"><i>*JMP</i>a16</td>
                <td class="jmp"><i>CZ</i>a16</td>
                <td class="jmp"><i>CALL</i>a16</td>
                <td class="alu"><i>ACI</i>d8</td>
                <td class="jmp"><i>RST</i>1</td>
            </tr>
            <tr>
                <td>Dx</td>
                <td class="jmp"><i>RNC</i></td>
                <td class="mem16"><i>POP</i>D</td>
                <td class="jmp"><i>JNC</i>a16</td>
                <td class="io"><i>OUT</i>d8</td>
                <td class="jmp"><i>CNC</i>a16</td>
                <td class="mem16"><i>PUSH</i>D</td>
                <td class="alu"><i>SUI</i>d8</td>
                <td class="jmp"><i>RST</i>2</td>
                <td class="jmp"><i>RC</i></td>
                <td class="jmp"><i>*RET</i></td>
                <td class="jmp"><i>JC</i>a16</td>
                <td class="io"><i>IN</i>d8</td>
                <td class="jmp"><i>CC</i>a16</td>
                <td class="jmp"><i>*CALL</i>a16</td>
                <td class="alu"><i>SBI</i>d8</td>
                <td class="jmp"><i>RST</i>3</td>
            </tr>
            <tr>
                <td>Ex</td>
                <td class="jmp"><i>RPO</i></td>
                <td class="mem16"><i>POP</i>H</td>
                <td class="jmp"><i>JPO</i>a16</td>
                <td class="mem16"><i>XTHL</i></td>
                <td class="jmp"><i>CPO</i>a16</td>
                <td class="mem16"><i>PUSH</i>H</td>
                <td class="alu"><i>ANI</i>d8</td>
                <td class="jmp"><i>RST</i>4</td>
                <td class="jmp"><i>RPE</i></td>
                <td class="jmp"><i>PCHL</i></td>
                <td class="jmp"><i>JPE</i>a16</td>
                <td class="mem16"><i>XCHG</i></td>
                <td class="jmp"><i>CPE</i>a16</td>
                <td class="jmp"><i>*CALL</i>a16</td>
                <td class="alu"><i>XRI</i>d8</td>
                <td class="jmp"><i>RST</i>5</td>
            </tr>
            <tr>
                <td>Fx</td>
                <td class="jmp"><i>RP</i></td>
                <td class="mem16"><i>POP</i>PSW</td>
                <td class="jmp"><i>JP</i>a16</td>
                <td class="io"><i>DI</i></td>
                <td class="jmp"><i>CP</i>a16</td>
                <td class="mem16"><i>PUSH</i>PSW</td>
                <td class="alu"><i>ORI</i>d8</td>
                <td class="jmp"><i>RST</i>6</td>
                <td class="jmp"><i>RM</i></td>
                <td class="mem16"><i>SPHL</i></td>
                <td class="jmp"><i>JM</i>a16</td>
                <td class="io"><i>EI</i></td>
                <td class="jmp"><i>CM</i>a16</td>
                <td class="jmp"><i>*CALL</i>a16</td>
                <td class="alu"><i>CPI</i>d8</td>
                <td class="jmp"><i>RST</i>7</td>
            </tr>
        </tbody>
    </table>
</div>

<style>
    .visualizer {
        position: fixed;
        right: 10px;
        bottom: 40px;
        z-index: 900;
        cursor: move;
        user-select: none;
    }
    .titlebar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #9f9f9f;
        color: black;
        font-family: monospace;
        font-size: 8pt;
        padding: 1px 4px;
    }
    .close-btn {
        all: unset;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0 2px;
    }
    .close-btn:hover {
        color: red;
    }
    table {
        border-width: 0px;
        border-style: solid;
        border-color: black;
        border-collapse: collapse;
    }
    tr {
        text-align: center;
    }
    thead tr {
        text-align: center;
        background-color: #9f9f9f;
    }
    td:first-child {
        background-color: #9f9f9f;
    }
    td {
        padding: 0 2px;
        border: 1px solid black;
        border-collapse: collapse;
        color: #000000;
        font-family: monospace;
        font-size: 6pt;
    }
    :global(td.active) {
        background-color: red !important;
    }
    i {
        font-style: normal;
        display: block;
    }
    .mem {
        background-color: #ccccff;
    }
    .mem16 {
        background-color: #ccffcc;
    }
    .alu {
        background-color: #ffff99;
    }
    .alu16 {
        background-color: #ffcccc;
    }
    .jmp {
        background-color: #ffcc99;
    }
    .io {
        background-color: #33cccc;
    }
    .nop {
        background-color: #ff99cc;
    }
    .hlt {
        background-color: #eecc22;
    }
</style>
