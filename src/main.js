import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import './style.css';

// ---------- 상수 (실물 스펙: m 단위) ----------
const CHAMBER_R = 0.36;          // 혼합구 반지름 (Ø72cm, 20% 확대)
const BALL_R = 0.024;            // 추첨볼 반지름 (20% 확대)
const CENTER = new THREE.Vector3(0, 0.42, 0); // 커진 구가 받침 링에 닿도록
const CAPTURE_POS = CENTER.clone().add(new THREE.Vector3(0, 0.19, 0));
const CAPTURE_R = 0.055;
const MAX_R = CHAMBER_R - BALL_R - 0.005;

function ballColor(n) {
  if (n <= 10) return '#f2c230';
  if (n <= 20) return '#4a90e2';
  if (n <= 30) return '#e4574f';
  if (n <= 40) return '#8a8f98';
  return '#3faf6e';
}

function makeBallTexture(n) {
  const S = 256; // 고해상도 번호판
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = ballColor(n);
  g.fillRect(0, 0, S, S);
  // 흰색 번호판: 구면(경도360°:위도180°)에서 둥글게 보이도록 세로로 긴 타원 + 가로 압축 숫자
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(S / 2, S / 2, 30, 60, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = n <= 10 ? '#1a1a1a' : '#222';
  g.save();
  g.translate(S / 2, S / 2 + 2);
  g.scale(0.5, 1);
  g.font = '900 52px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 0, 0);
  if (n === 6 || n === 9) {
    g.fillRect(-18, 30, 36, 8); // 6·9 구분용 밑줄
  }
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 렌더러/씬 ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
scene.fog = new THREE.Fog(0x000000, 6, 14);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
camera.position.set(0, 2.26, 1.78); // 정면 뷰, 타겟 기준 고도각 45도
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(CENTER); // 구 중심 = 화면 중심
controls.enableDamping = true;
controls.enableRotate = false; // 화면 회전 비활성화 (줌/이동만 가능)
controls.enablePan = false; // 위치 이동 비활성화

scene.add(new THREE.HemisphereLight(0xdfeaff, 0x1a2030, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.5, 4, 2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6ea8ff, 0.8);
rim.position.set(-2.5, 2, -2);
scene.add(rim);

// 바닥
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 64),
  new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- 비너스 본체 ----------
const metal = new THREE.MeshStandardMaterial({ color: 0x2a3346, metalness: 0.75, roughness: 0.35 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x161c29, metalness: 0.6, roughness: 0.5 });
const tableGreen = new THREE.MeshStandardMaterial({ color: 0x14532d, metalness: 0.3, roughness: 0.5 });
const columnOrange = new THREE.MeshStandardMaterial({ color: 0xb34a00, metalness: 0.55, roughness: 0.4 });

function addMesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
// 바닥에 직접 놓이는 원형 테이블 (하부 원기둥 제거)
addMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 72), tableGreen, 0, 0.025, 0); // 테이블 상판 (상단면 0.05)
addMesh(new THREE.CylinderGeometry(0.33, 0.36, 0.08, 48), columnOrange, 0, 0.09, 0); // 구 받침 링 (주황색)
// (받침 ZZONTTO 데칼 제거)

const WALL = 0.012; // 유리 두께
const chamberGroup = new THREE.Group(); // 구+내벽+절단면 (CENTER 따라 이동)
scene.add(chamberGroup);
const glass = new THREE.Mesh(
  new THREE.SphereGeometry(CHAMBER_R, 48, 32, 0, Math.PI * 2, 0.42, Math.PI - 0.42), // 윗부분 공 출입 구멍
  new THREE.MeshPhysicalMaterial({
    color: 0xbfd9ff, transparent: true, opacity: 0.16,
    roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false
  })
);
chamberGroup.add(glass);
const glassInner = new THREE.Mesh(
  new THREE.SphereGeometry(CHAMBER_R - WALL, 48, 32, 0, Math.PI * 2, 0.42, Math.PI - 0.42),
  new THREE.MeshPhysicalMaterial({
    color: 0x9fc4ff, transparent: true, opacity: 0.22,
    roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false
  })
);
chamberGroup.add(glassInner);
// 구멍 절단면 — 두께가 보이도록
const edge = new THREE.Mesh(
  new THREE.CylinderGeometry(CHAMBER_R * Math.sin(0.42), (CHAMBER_R - WALL) * Math.sin(0.42), WALL * 1.2, 48, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xd6e9ff, transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide })
);
edge.position.y = Math.cos(0.42) * (CHAMBER_R - WALL / 2);
chamberGroup.add(edge);
chamberGroup.position.copy(CENTER);

// 공용 상승관: 캡처존 → 꼭대기 매니폴드 (뽑힌 공이 빨려 올라가는 단일 파이프)
// (레일 파이프 시각 제거 — 공은 보이지 않는 관 경로를 그대로 이동)
// 모든 공이 공유하는 상승 경로
// (공용 상승관 제거 — 7개 레일이 캡처존까지 직접 이어져 하단에서 하나로 모임)
// 매니폴드 (상승관 → 슬롯 레일 분기점)
// (매니폴드 제거)
// (중복 링 제거 — 구멍 테두리는 상단 1개만)

// 반지름이 시작→끝으로 커지는 테이퍼 파이프 (TubeGeometry는 등반경이라 직접 생성)
// (테이퍼 파이프 생성 함수 제거 — 파이프 시각 없음)

// 테이블 상판 둘레를 따라 원형으로 배치되는 6개 슬롯 + 방사형 레일
const SLOT_R = 0.51;
const slotPos = [];
const railCurves = [];
const slotMeshes = [];
const slotHit = [];
for (let i = 0; i < 6; i++) {
  const th = (-75 + i * 30) * Math.PI / 180; // 앞 절반에만 배치
  const sx = Math.sin(th) * SLOT_R, sz = Math.cos(th) * SLOT_R;
  const ped = addMesh(new THREE.CylinderGeometry(0.04, 0.0433, 0.03, 24), columnOrange, sx, 0.065, sz); // 기본 주황 (2/3 크기)
  slotMeshes.push(ped);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.14, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(sx, 0.1, sz);
  hit.userData.slot = i;
  scene.add(hit);
  slotHit.push(hit);
  slotPos.push(new THREE.Vector3(sx, 0.176, sz));
  // 구멍→슬롯: 수직 상승 후 포물선 아치 (탄도 곡선)
  const cy = CENTER.y;
  const holeTop = new THREE.Vector3(0, cy + 0.34, 0); // 구멍 중심
  const curve = new THREE.CurvePath();
  curve.add(new THREE.LineCurve3(CAPTURE_POS.clone(), holeTop));
  curve.add(new THREE.CubicBezierCurve3(
    holeTop,
    new THREE.Vector3(0, cy + 0.58, 0), // 수직 상승 탄젠트
    new THREE.Vector3(sx, cy + 0.5, sz), // 슬롯 직상방 수직 진입 탄젠트
    new THREE.Vector3(sx, 0.6, sz) // 낙하 시작점
  ));
  railCurves.push(curve);
  // (파이프 메쉬 없음 — 공만 같은 곡선을 따라 이동)
}

// ---------- 물리 ----------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;
const ballPhysMat = new CANNON.Material('ball');
world.addContactMaterial(new CANNON.ContactMaterial(ballPhysMat, ballPhysMat, {
  friction: 0.2, restitution: 0.55
}));
world.defaultContactMaterial.friction = 0.2;

const balls = [];
const sphereGeo = new THREE.SphereGeometry(BALL_R, 48, 32);

function randomInSphere(r) {
  const v = new THREE.Vector3();
  do {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while (v.lengthSq() > 1);
  return v.multiplyScalar(r);
}

function spawnBalls() {
  for (const b of balls) {
    try { world.removeBody(b.body); } catch {}
    scene.remove(b.mesh);
  }
  balls.length = 0;
  for (let n = 1; n <= 45; n++) {
    const mesh = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshStandardMaterial({ map: makeBallTexture(n), roughness: 0.35 })
    );
    mesh.castShadow = true;
    const p = CENTER.clone().add(randomInSphere(0.16));
    mesh.position.copy(p);
    scene.add(mesh);
    const body = new CANNON.Body({
      mass: 0.005,
      shape: new CANNON.Sphere(BALL_R),
      position: new CANNON.Vec3(p.x, p.y, p.z),
      material: ballPhysMat,
      linearDamping: 0.12,
      angularDamping: 0.15
    });
    body.velocity.set(Math.random() * 2 - 1, Math.random() * 1.5, Math.random() * 2 - 1);
    world.addBody(body);
    balls.push({ num: n, mesh, body, captured: false, anim: null });
  }
}

// ---------- 추첨 상태 ----------
let windStrength = 20; // 고정 (낮춰서 천천히)
let turbScale = 1.0;   // 고정 (난류 100)
let mixing = false;
let allowedOrder = [];
let captureIndex = 0;
let lastCaptureT = 0;
let mixStartT = 0;

// 구 위치 모드: float(공중 부유) / drag(드래그 중) / snap(이동 중) / seated(받침 착석)
const SEAT = new THREE.Vector3(0, 0.48, 0); // 커진 구가 받침 링에 닿도록
const FLOAT = new THREE.Vector3(0, 0.78, 0);
let mode = 'float';
let drawState = 'empty'; // empty | drawing | done
let snapToSeat = false; // 스냅 목적지 (참조 비교 대신 플래그)
let slotOn = [true, true, true, true, true, true]; // 착지점 선택 (기본 주황=true)
let activeIdx = []; // 이번 추첨에 쓰는 슬롯 순서
const dragTarget = new THREE.Vector3();
const snapTarget = new THREE.Vector3();
CENTER.copy(FLOAT);
spawnBalls(); // 부유 위치 기준 초기 스폰

function drawNumbers(n) {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const pick = [];
  for (let i = 0; i < n; i++) {
    pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return pick;
}

// 바람/난류 고정값 사용 (조절 UI 없음)

// ---------- 효과음 (외부 파일 없이 Web Audio 합성) ----------
const Sfx = (() => {
  let ctx = null, master = null, mixGain = null, rollGain = null, _noise = null, _muted = false;
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = _muted ? 0 : 0.6;
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 2;
      _noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = _noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // 시작/끝 주파수를 잇는 짧은 톤
  function tone(f0, f1, t0, dur, type = 'sine', vol = 0.3) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // 주파수를 훑는 노이즈 (푸시·바람 느낌)
  function noise(t0, dur, { f0 = 400, f1 = 4000, q = 1, vol = 0.25 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = _noise; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }
  return {
    unlock() { ensure(); },
    // 소리 켜기/끄기 (마스터 게인 0/1로 전체 차단)
    setMuted(m) {
      _muted = m;
      if (master) {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(m ? 0 : 0.6, t, 0.03);
      }
    },
    get muted() { return _muted; },
    // 착지점 선택/해제
    select(on) {
      ensure();
      const t = ctx.currentTime;
      if (on) { tone(740, 1180, t, 0.09, 'triangle', 0.35); tone(1480, 1480, t + 0.05, 0.07, 'sine', 0.1); }
      else { tone(740, 440, t, 0.1, 'triangle', 0.3); }
    },
    // 공이 캡처되어 구멍으로 뽑힐 때
    pop() {
      ensure();
      const t = ctx.currentTime;
      noise(t, 0.35, { f0: 500, f1: 3500, q: 0.8, vol: 0.22 });
      tone(320, 900, t, 0.3, 'sine', 0.3);
      tone(1200, 1800, t + 0.1, 0.2, 'triangle', 0.1);
    },
    // 슬롯에 닿을 때
    land() {
      ensure();
      const t = ctx.currentTime;
      tone(180, 90, t, 0.12, 'sine', 0.45);
      noise(t, 0.08, { f0: 900, f1: 300, q: 1, vol: 0.2 });
    },
    // 바닥에서 구를 들어올릴 때
    grab() {
      ensure();
      const t = ctx.currentTime;
      noise(t, 0.28, { f0: 300, f1: 2600, q: 0.7, vol: 0.18 });
      tone(240, 620, t, 0.26, 'sine', 0.22);
      tone(900, 1400, t + 0.06, 0.16, 'triangle', 0.08);
    },
    // 구를 이동시키는 동안 안에서 공이 구르는 소리 (속도에 비례, 매 프레임 호출)
    roll(level) {
      ensure();
      if (!rollGain) {
        rollGain = ctx.createGain();
        rollGain.gain.value = 0;
        rollGain.connect(master);
        const s = ctx.createBufferSource(); s.buffer = _noise; s.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
        s.connect(lp); lp.connect(rollGain);
        s.start();
        const lfo = ctx.createOscillator(); lfo.frequency.value = 7; // 공끼리 부딪히는 리듬
        const lg = ctx.createGain(); lg.gain.value = 0.06;
        lfo.connect(lg); lg.connect(rollGain.gain);
        lfo.start();
      }
      const t = ctx.currentTime;
      rollGain.gain.cancelScheduledValues(t);
      rollGain.gain.setTargetAtTime(level, t, 0.05); // 빠르게 반응했다가 부드럽게 감쇠
    },
    // 혼합 중 공이 굴러가는 소리 (켜기/끄기)
    mixing(on) {
      ensure();
      const t = ctx.currentTime;
      if (!mixGain) {
        mixGain = ctx.createGain();
        mixGain.gain.value = 0;
        mixGain.connect(master);
        const s = ctx.createBufferSource(); s.buffer = _noise; s.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
        s.connect(lp); lp.connect(mixGain);
        s.start();
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; // 공이 부딪히는 두근거림
        const lg = ctx.createGain(); lg.gain.value = 0.05;
        lfo.connect(lg); lg.connect(mixGain.gain);
        lfo.start();
      }
      mixGain.gain.cancelScheduledValues(t);
      mixGain.gain.setTargetAtTime(on ? 0.16 : 0.0001, t, on ? 0.3 : 0.25);
    },
  };
})();

// 우측 상단 소리 버튼
(() => {
  const btn = document.getElementById('sndBtn');
  const on = document.getElementById('sndOn');
  const off = document.getElementById('sndOff');
  if (!btn) return;
  const apply = () => {
    btn.classList.toggle('muted', Sfx.muted);
    on.style.display = Sfx.muted ? 'none' : '';
    off.style.display = Sfx.muted ? '' : 'none';
  };
  btn.addEventListener('click', () => {
    Sfx.unlock();       // 첫 클릭으로 오디오 활성화
    Sfx.setMuted(!Sfx.muted);
    apply();
  });
  apply();
})();

function startDraw() {
  if (drawState === 'drawing') return;
  activeIdx = slotOn.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (activeIdx.length === 0) return;
  allowedOrder = drawNumbers(activeIdx.length);
  captureIndex = 0;
  drawState = 'drawing';
  mixing = true;
  Sfx.mixing(true);
  mixStartT = performance.now() / 1000;
  lastCaptureT = mixStartT;
}

function resetDraw() {
  mixing = false;
  Sfx.mixing(false);
  allowedOrder = [];
  captureIndex = 0;
  drawState = 'empty';
  spawnBalls();
}

// ---------- 구 드래그앤드롭 ----------
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // 카메라 정면 z=0 평면
const hitPoint = new THREE.Vector3();

function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointerNDC.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function updateDragTarget() {
  raycaster.setFromCamera(pointerNDC, camera);
  if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
    dragTarget.set(
      THREE.MathUtils.clamp(hitPoint.x, -0.7, 0.7),
      THREE.MathUtils.clamp(hitPoint.y, SEAT.y, 1.25),
      0
    );
  }
}
function toggleSlot(i) {
  if (mode !== 'float') return; // 구가 공중에 떠 있을 때만 선택 가능
  slotOn[i] = !slotOn[i];
  slotMeshes[i].material = slotOn[i] ? columnOrange : tableGreen;
  Sfx.select(slotOn[i]);
}
canvas.addEventListener('pointerdown', (e) => {
  Sfx.unlock(); // 첫 터치에서 오디오 활성화
  setPointer(e);
  raycaster.setFromCamera(pointerNDC, camera);
  if (drawState !== 'drawing' && mode !== 'drag') {
    const hits = raycaster.intersectObjects(slotHit, false);
    if (hits.length > 0) {
      toggleSlot(hits[0].object.userData.slot);
      return;
    }
  }
  if (raycaster.intersectObject(glass, false).length > 0) {
    mode = 'drag';
    mixing = false;
    Sfx.mixing(false);
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    canvas.style.cursor = 'grabbing';
    updateDragTarget();
  }
});
canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  if (mode === 'drag') { updateDragTarget(); return; }
  raycaster.setFromCamera(pointerNDC, camera);
  const hitSlot = mode === 'float' && raycaster.intersectObjects(slotHit, false).length > 0;
  const hitGlass = !hitSlot && raycaster.intersectObject(glass, false).length > 0;
  canvas.style.cursor = hitSlot ? 'pointer' : hitGlass ? 'grab' : 'default';
});
canvas.addEventListener('pointerup', () => {
  if (mode !== 'drag') return;
  Sfx.grab(); // 마우스를 놓을 때 나는 소리
  canvas.style.cursor = 'default';
  mode = 'snap';
  const orangeCount = slotOn.filter(Boolean).length;
  if (CENTER.distanceTo(SEAT) < 0.15 && orangeCount > 0) { snapTarget.copy(SEAT); snapToSeat = true; } // 도착하면 추첨 시작/재개
  else { snapTarget.copy(FLOAT); snapToSeat = false; resetDraw(); } // 복귀 + 리셋 (주황 0개면 받침에 붙지 않음)
});

// ---------- 시뮬레이션 스텝 ----------
const _f = new CANNON.Vec3();
window.__venus = { get mode() { return mode; }, get drawState() { return drawState; }, get slotOn() { return slotOn.join(''); }, get allowed() { return (allowedOrder || []).join(','); }, get capIdx() { return captureIndex; } };
const _cdelta = new THREE.Vector3();
let _rollOn = false; // 롤 사운드 재생 중 여부
const _prevCenter = CENTER.clone();
const _xAxis = new THREE.Vector3(1, 0, 0); // 공 텍스처 번호면 방향
const _toCam = new THREE.Vector3();
const _faceQ = new THREE.Quaternion();
function applyWind(t) {
  const up = windStrength * 0.0035; // 25 고정 → 약 0.088N (중력 0.05N 상회)
  for (const b of balls) {
    if (b.captured) continue;
    const p = b.body.position;
    const dx = p.x - CENTER.x, dz = p.z - CENTER.z;
    const n = b.num;
    // 소용돌이 최소화 + 주기적 방향 반전 (한쪽 회전 방지)
    const swirl = up * 0.12 * Math.sin(t * 0.7 + n * 0.9);
    // 난류 강화: 공마다 다른 위상·주파수로 제각각 움직임
    const gust = Math.pow(Math.max(0, Math.sin(t * 3.3 + n * 3.1)), 3) * 0.06;
    const fx = -dz * swirl * 4 + (Math.sin(t * 7.3 + n * 1.7) * 0.06 + Math.sin(t * 13.7 + n * 4.3) * 0.03 + Math.sin(t * 3.9 + n * 7.7) * 0.03) * turbScale;
    const fz = dx * swirl * 4 + (Math.cos(t * 6.1 + n * 2.3) * 0.06 + Math.cos(t * 11.3 + n * 2.9) * 0.03 + Math.cos(t * 5.1 + n * 5.3) * 0.03) * turbScale;
    const fy = up + (gust + Math.sin(t * 9.7 + n) * 0.03 + Math.sin(t * 15.3 + n * 3.7) * 0.015) * turbScale;
    _f.set(fx, fy, fz);
    b.body.applyForce(_f);
    // 개별 텀블링 (번호면이 제각각 돌아감)
    const tq = 1e-5 * turbScale;
    b.body.torque.set(Math.sin(t * 5.3 + n * 2.1) * tq, Math.sin(t * 4.7 + n * 3.3) * tq, Math.cos(t * 6.1 + n * 1.3) * tq);
    b.body.wakeUp();
  }
}

function contain(t) {
  for (const b of balls) {
    if (b.captured) continue;
    const p = b.body.position;
    const dx = p.x - CENTER.x, dy = p.y - CENTER.y, dz = p.z - CENTER.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > MAX_R) {
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;
      p.x = CENTER.x + nx * MAX_R;
      p.y = CENTER.y + ny * MAX_R;
      p.z = CENTER.z + nz * MAX_R;
      const v = b.body.velocity;
      const vn = v.x * nx + v.y * ny + v.z * nz;
      if (vn > 0) {
        const rest = 0.55;
        v.x -= (1 + rest) * vn * nx;
        v.y -= (1 + rest) * vn * ny;
        v.z -= (1 + rest) * vn * nz;
      }
    }
  }
}

function tryCapture(now) {
  if (!mixing || allowedOrder.length !== activeIdx.length || captureIndex >= activeIdx.length) return;
  if (now - mixStartT < 2) return;          // 최소 혼합 2초
  if (now - lastCaptureT < 1.1) return;     // 방송 템포: 1.1초 간격
  const want = allowedOrder[captureIndex];
  const b = balls.find((x) => !x.captured && x.num === want);
  if (!b) return;
  const d = b.mesh.position.distanceTo(CAPTURE_POS);
  // 목표볼이 캡처존 근처 or 시간 초과 시 강제 캡처(연출 보장)
  const force = now - lastCaptureT > 6;
  if (d < CAPTURE_R || force) {
    b.captured = true;
    Sfx.pop(); // 공이 캡처되어 나올 때
    try { world.removeBody(b.body); } catch {}
    // 레일 상승 → 슬롯 낙하 2단계 연출 (7개 레일이 캡처존까지 직접 연결)
    b.anim = {
      phase: 'pipe', t: 0, dur: 1.6,
      curve: railCurves[activeIdx[captureIndex]],
      slot: slotPos[activeIdx[captureIndex]].clone(),
      vy: 0
    };
    captureIndex++;
    lastCaptureT = now;
    if (captureIndex >= activeIdx.length) {
      mixing = false;
      Sfx.mixing(false);
      drawState = 'done';
    }
  } else {
    // 목표볼을 캡처존으로 살짝 유도 (자석 연출)
    const dir = CAPTURE_POS.clone().sub(b.mesh.position).normalize();
    b.body.applyForce(new CANNON.Vec3(dir.x * 0.02, dir.y * 0.02 + 0.01, dir.z * 0.02));
  }
}

// ---------- 루프 ----------
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const t = clock.elapsedTime;
  const now = performance.now() / 1000;

  // 구 위치 업데이트: 부유 bobbing / 드래그 추적 / 스냅 이동
  if (mode === 'float') {
    CENTER.y = FLOAT.y + Math.sin(t * 1.4) * 0.035;
  } else if (mode === 'drag') {
    CENTER.lerp(dragTarget, Math.min(dt * 12, 1));
  } else if (mode === 'snap') {
    CENTER.lerp(snapTarget, Math.min(dt * 8, 1));
    if (CENTER.distanceTo(snapTarget) < 0.005) {
      if (snapToSeat) {
        CENTER.copy(SEAT);
        mode = 'seated';
        if (drawState === 'empty') startDraw();
        else if (drawState === 'drawing') { mixing = true; Sfx.mixing(true); lastCaptureT = now; }
      } else {
        CENTER.copy(FLOAT);
        mode = 'float';
      }
    }
  }
  chamberGroup.position.copy(CENTER);
  CAPTURE_POS.set(CENTER.x, CENTER.y + 0.19, CENTER.z);
  // 구가 움직인 만큼 Chamber 안의 공도 함께 이동
  _cdelta.copy(CENTER).sub(_prevCenter);
  if (_cdelta.lengthSq() > 1e-10) {
    for (const b of balls) {
      if (b.captured) continue;
      b.body.position.x += _cdelta.x;
      b.body.position.y += _cdelta.y;
      b.body.position.z += _cdelta.z;
    }
  }
  _prevCenter.copy(CENTER);

  // 구를 이동시키는 동안: 속도에 비례해서 안에서 공이 굴러가는 소리
  if (mode === 'drag') {
    const sp = _cdelta.length() / Math.max(dt, 1e-4);
    Sfx.roll(Math.min(sp * 0.55, 0.32));
  } else if (_rollOn) {
    Sfx.roll(0);
  }
  _rollOn = mode === 'drag';

  if (mixing) applyWind(t);
  world.step(1 / 60, dt, 3);
  contain(t);

  for (const b of balls) {
    if (b.captured && b.anim) {
      const a = b.anim;
      if (a.phase === 'pipe') {
        // 1단계: 등속 이동 (처음 0.35초만 가속) — 꺾임에서 끊김 없음
        a.len = a.len || a.curve.getLength();
        a.spd = Math.min((a.spd || 0) + dt * 3.2, 1.15); // 최고속 0.75→1.15
        a.u = Math.min((a.u || 0) + (dt * a.spd) / a.len, 1);
        a.curve.getPointAt(a.u, b.mesh.position);
        const g = Math.min(Math.max((a.u - 0.12) / 0.88, 0), 1);
        b.mesh.scale.setScalar(1 + 3 * g); // 구멍 통과 후 커지도록 지연 확대
        b.mesh.rotation.x += dt * 6;
        b.mesh.rotation.y += dt * 3;
        if (a.u >= 1) {
          // 관 끝 속도·방향을 그대로 이어받아 낙하
          a.phase = 'drop';
          const tan = a.curve.getTangentAt(1, new THREE.Vector3());
          a.vy = tan.y * a.spd;
          a.vx = tan.x * a.spd;
          a.vz = tan.z * a.spd;
        }
      } else {
        // 2단계: 관 끝 방향을 유지하며 자연스럽게 낙하 + 슬롯 유도
        a.vy -= 9.82 * dt;
        const p = b.mesh.position;
        p.x += a.vx * dt;
        p.z += a.vz * dt;
        const damp = Math.max(0, 1 - dt * 2.5);
        a.vx *= damp;
        a.vz *= damp;
        p.x += (a.slot.x - p.x) * Math.min(dt * 2.5, 1);
        p.z += (a.slot.z - p.z) * Math.min(dt * 2.5, 1);
        p.y += a.vy * dt;
        // 번호면이 카메라를 향하도록 정렬
        _toCam.set(camera.position.x - p.x, camera.position.y - p.y, camera.position.z - p.z).normalize();
        _faceQ.setFromUnitVectors(_xAxis, _toCam);
        b.mesh.quaternion.slerp(_faceQ, Math.min(dt * 5, 1));
        if (p.y <= a.slot.y) {
          p.y = a.slot.y;
          if (Math.abs(a.vy) > 0.9) {
            a.vy = -a.vy * 0.15; // 작게 한 번만 바운스 후 바로 안착
          } else {
            p.copy(a.slot);      // 안착
            b.anim = null;
            Sfx.land();
          }
        }
      }
    } else if (!b.captured) {
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w);
    }
  }

  tryCapture(now);
  controls.update();
  renderer.render(scene, camera);
}
tick();
