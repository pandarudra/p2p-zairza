const socket = io();

const peer = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stunprotocol.org",
    },
  ],
});

let recipientId = null;

const callUser = async (to) => {
  recipientId = to;
  const status = document.getElementById("status");
  status.innerHTML = `Calling ${to}...`;
  const offer = await peer.createOffer();
  await peer.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("outgoing:call", { fromOffer: offer, to });
};

peer.ontrack = ({ streams: [stream] }) => {
  const remoteVideo = document.getElementById("remote-video");
  remoteVideo.srcObject = stream;
  remoteVideo.play();
};

const getUsers = async () => {
  const userList = document.getElementById("users");

  const res = await fetch("/users", { method: "GET" });
  const users = await res.json();
  console.log(users);

  users.forEach((user) => {
    const btn = document.createElement("button");
    const text = document.createTextNode(user);
    btn.setAttribute("onclick", `callUser("${user}")`);
    btn.appendChild(text);
    userList.appendChild(btn);
  });
};

socket.on("user:joined", (id) => {
  const userList = document.getElementById("users");
  const btn = document.createElement("button");
  const text = document.createTextNode(id);
  btn.id = id;
  btn.setAttribute("onclick", `callUser("${id}")`);
  btn.appendChild(text);
  userList.appendChild(btn);
});

socket.on("incoming:call", async (data) => {
  const status = document.getElementById("status");
  status.innerHTML = `Incoming call...`;
  const { from, offer } = data;

  const acceptButton = document.getElementById("accept-call");
  acceptButton.style.display = "block";
  acceptButton.onclick = async () => {
    acceptButton.style.display = "none";
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
    } catch (error) {
      console.error("Error setting remote description:", error);
    }

    const myStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    myStream.getTracks().forEach((track) => peer.addTrack(track, myStream)); // Add local tracks

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(answer));
    socket.emit("answer:call", { ans: answer, to: from });
  };
});

socket.on("inanswer:call", async (data) => {
  const status = document.getElementById("status");
  status.innerHTML = `Incoming Answer...`;
  const { from, answer } = data;

  try {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error("Error setting remote description:", error);
  }
});

socket.on("user:left", (id) => {
  const userList = document.getElementById("users");
  const btn = document.getElementById(id);
  userList.removeChild(btn);
});

const getUserMedia = async () => {
  try {
    const userMedia = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    const locVideo = document.getElementById("local-video");
    locVideo.srcObject = userMedia;
    locVideo.play();
    for (const track of userMedia.getTracks()) {
      peer.addTrack(track, userMedia);
    }
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
};

peer.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("icecandidate", {
      candidate: event.candidate,
      to: recipientId,
    });
  }
};

socket.on("icecandidate", (data) => {
  const { candidate } = data;
  peer.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
    console.error("Error adding received ice candidate:", error);
  });
});

window.addEventListener("load", () => {
  getUserMedia();
  getUsers();
});
