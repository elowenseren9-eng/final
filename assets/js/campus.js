"use strict";

const campus3d = { landmarks: [], scene: null, camera: null, renderer: null, controls: null, groups: new Map(), raycaster: null, pointer: null, animationId: null };

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("resetScene").addEventListener("click", resetSceneView);
  document.getElementById("autoRotate").addEventListener("change", (event) => { if (campus3d.controls) campus3d.controls.autoRotate = event.target.checked; });
  window.addEventListener("resize", resizeScene);
  loadCampusScene();
});

async function loadCampusScene() {
  try {
    const payload = await CampusApp.loadJson("data/campus.json", (data) => {
      if (!data || !Array.isArray(data.landmarks)) throw new Error("campus.json 缺少 landmarks 数组");
      data.landmarks.forEach((item) => { if (!item.id || !item.name || !Number.isFinite(Number(item.height))) throw new Error("地标字段不完整"); });
      return data;
    });
    campus3d.landmarks = payload.landmarks;
    renderTextList();
    createLandmarkButtons();
    if (!payload.landmarks.length) {
      CampusApp.setStatus("campusStatus", "空数据状态已启用，目前没有可渲染的三维地标。", "warning");
      return;
    }
    initScene();
    CampusApp.setStatus("campusStatus", "三维场景已加载。可拖动、缩放，也可点击建筑查看说明。", "success");
  } catch (error) {
    console.warn("三维地标读取失败：", error.message);
    campus3d.landmarks = [];
    renderTextList();
    CampusApp.setStatus("campusStatus", `三维数据读取失败：${error.message}。请检查本地服务器与 WebGL 设置。`, "error");
  }
}

function initScene() {
  const host = document.getElementById("campusScene");
  if (typeof THREE === "undefined" || typeof THREE.OrbitControls === "undefined") throw new Error("Three.js 或 OrbitControls 未加载");
  if (!window.WebGLRenderingContext) throw new Error("当前浏览器不支持 WebGL");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x082f27);
  scene.fog = new THREE.Fog(0x082f27, 18, 40);
  const camera = new THREE.PerspectiveCamera(47, host.clientWidth / host.clientHeight, 0.1, 100);
  camera.position.set(12, 10, 14);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.replaceChildren(renderer.domElement);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.6, 0);
  controls.minDistance = 7;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.autoRotateSpeed = 0.65;
  scene.add(new THREE.HemisphereLight(0xfff4d8, 0x123d33, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(10, 15, 9);
  sun.castShadow = true;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(13, 72), new THREE.MeshStandardMaterial({ color: 0x386f5e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xc8b995, roughness: 1 });
  [[0, 0, 1.1, 22], [0, 0, 22, 1.1]].forEach(([x, z, width, depth]) => {
    const path = new THREE.Mesh(new THREE.BoxGeometry(width, .04, depth), pathMaterial);
    path.position.set(x, .02, z);
    path.receiveShadow = true;
    scene.add(path);
  });

  campus3d.groups.clear();
  campus3d.landmarks.forEach((landmark) => {
    const group = buildLandmark(landmark);
    group.position.set(landmark.x, 0, landmark.z);
    group.userData.landmarkId = landmark.id;
    group.traverse((object) => { object.userData.landmarkId = landmark.id; });
    scene.add(group);
    campus3d.groups.set(landmark.id, group);
  });
  addTrees(scene);
  campus3d.scene = scene; campus3d.camera = camera; campus3d.renderer = renderer; campus3d.controls = controls; campus3d.raycaster = new THREE.Raycaster(); campus3d.pointer = new THREE.Vector2();
  renderer.domElement.addEventListener("click", pickLandmark);
  animateScene();
}

function buildLandmark(landmark) {
  const group = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: new THREE.Color(landmark.color), roughness: .75 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x183f36, roughness: .9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, landmark.height, 2.25), wall);
  body.position.y = landmark.height / 2;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.05, 4), roofMaterial);
  roof.position.y = landmark.height + .52; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  group.add(roof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(.62, .88), new THREE.MeshBasicMaterial({ color: 0x5b3f2b }));
  door.position.set(0, .44, 1.131); group.add(door);
  for (let y = 1; y < landmark.height; y += .85) {
    [-.72, 0, .72].forEach((x) => {
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), new THREE.MeshBasicMaterial({ color: 0xffd980 }));
      windowMesh.position.set(x, y, 1.132); group.add(windowMesh);
    });
  }
  return group;
}

function addTrees(scene) {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a31 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x0c5f45 });
  for (let i = 0; i < 40; i += 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .6, 8), trunkMaterial); trunk.position.y = .3;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(.3, .85, 9), leafMaterial); leaves.position.y = .9;
    group.add(trunk, leaves);
    const angle = i / 40 * Math.PI * 2;
    const radius = 9.2 + (i % 3) * .55;
    group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    scene.add(group);
  }
}

function pickLandmark(event) {
  const rect = campus3d.renderer.domElement.getBoundingClientRect();
  campus3d.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  campus3d.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  campus3d.raycaster.setFromCamera(campus3d.pointer, campus3d.camera);
  const hits = campus3d.raycaster.intersectObjects([...campus3d.groups.values()], true);
  if (!hits.length) return;
  const id = hits[0].object.userData.landmarkId;
  const landmark = campus3d.landmarks.find((item) => item.id === id);
  if (landmark) focusLandmark(landmark);
}

function createLandmarkButtons() {
  const host = document.getElementById("landmarkButtons"); host.replaceChildren();
  campus3d.landmarks.forEach((landmark) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "btn btn-sm btn-outline-brand"; button.textContent = landmark.name;
    button.addEventListener("click", () => focusLandmark(landmark));
    host.append(button);
  });
}

function renderTextList() {
  const host = document.getElementById("landmarkTextList"); host.replaceChildren();
  if (!campus3d.landmarks.length) {
    host.innerHTML = '<div class="col-12"><div class="empty-state">当前没有地标数据。</div></div>';
    return;
  }
  campus3d.landmarks.forEach((landmark) => {
    const column = document.createElement("div"); column.className = "col-md-6 col-xl-3";
    column.innerHTML = `<article class="feature-card"><h3 class="mt-0">${CampusApp.escapeText(landmark.name)}</h3><p>${CampusApp.escapeText(landmark.description)}</p></article>`;
    host.append(column);
  });
}

function focusLandmark(landmark) {
  document.getElementById("landmarkName").textContent = landmark.name;
  document.getElementById("landmarkDescription").textContent = landmark.description;
  if (!campus3d.controls) return;
  const group = campus3d.groups.get(landmark.id);
  const target = group.position.clone().add(new THREE.Vector3(0, landmark.height / 2, 0));
  campus3d.controls.target.copy(target);
  campus3d.camera.position.set(target.x + 5.6, target.y + 3.4, target.z + 6.5);
  campus3d.controls.update();
  CampusApp.setStatus("campusStatus", `已定位到：${landmark.name}。`, "success");
}

function resetSceneView() {
  document.getElementById("landmarkName").textContent = "校园全景";
  document.getElementById("landmarkDescription").textContent = "可选择建筑查看说明，也可以继续自由拖动浏览。";
  if (!campus3d.controls) return;
  campus3d.camera.position.set(12, 10, 14);
  campus3d.controls.target.set(0, 1.6, 0);
  campus3d.controls.update();
}

function resizeScene() {
  if (!campus3d.renderer) return;
  const host = document.getElementById("campusScene");
  campus3d.camera.aspect = host.clientWidth / host.clientHeight;
  campus3d.camera.updateProjectionMatrix();
  campus3d.renderer.setSize(host.clientWidth, host.clientHeight);
}

function animateScene() {
  campus3d.animationId = requestAnimationFrame(animateScene);
  campus3d.controls.update();
  campus3d.renderer.render(campus3d.scene, campus3d.camera);
}

