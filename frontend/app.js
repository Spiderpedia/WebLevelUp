let currentPage = 0;
let totalPages = 0;
let ascendingOrder = true;
let userLoggedIn = false;
let spiders = [];
let navUsername;
let userID;
document.addEventListener("DOMContentLoaded", () => {
	const loginButton = document.getElementById("login-button");
	const logoutButton = document.getElementById("logout-button");
	navUsername = document.getElementById("nav-username");
	const carousel = document.getElementById("carousel");
	const carouselContainer = document.getElementById("carousel-container");
	const loginMessage = document.getElementById("loginMessage");
	const IMAGE_BASE_URL =
		"https://spiderpedia-bucket.s3.eu-west-1.amazonaws.com/";

	loginButton.addEventListener("click", function () {
		window.location.href = "/login";
	});

	logoutButton.addEventListener("click", function () {
		window.location.href = "/logout";
	});

	async function fetchSpidersInfo() {
		const apiUrl =
			"http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5000/api/spiders-info";
		try {
			const response = await fetch(apiUrl);
			const data = await response.json();
			console.log("Fetched spiders:", data);
			return data;
		} catch (error) {
			console.error("Error fetching spiders:", error);
			return [];
		}
	}

	function checkLoginAndRenderCards() {
		fetchSpidersInfo()
			.then((spiders) => {
				renderSpiderCards(spiders);
			})
			.catch((error) => {
				console.error("Error during fetching or rendering spiders:", error);
			});

		fetch("http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5000/user")
			.then((response) => response.json())
			.then(async (data) => {
				if (data !== "Not logged in") {
					userLoggedIn = true;
					loginButton.style.display = "none";
					logoutButton.style.display = "inline";
					navUsername.textContent = data.username;
					navUsername.style.display = "inline";
					carouselContainer.classList.remove("blur-effect");
					carousel.style.filter = "none";
					loginMessage.style.display = "none";
					console.log(navUsername.textContent);
					userID = await getUserId(navUsername.textContent);
				} else {
					loginButton.style.display = "inline";
					logoutButton.style.display = "none";
					navUsername.style.display = "none";
					carousel.style.filter = "blur(5px)";
					loginMessage.style.display = "block";
				}
			});
		const filterLikesLink = document.querySelector('a[href="#species"]');
		filterLikesLink.addEventListener("click", filterLikedSpiders);
	}

	function renderSpiderCards(spiderArray, filterLiked = false) {
		console.log("Rendering spider cards. Filter Liked:", filterLiked);
		carousel.innerHTML = "";

		spiderArray.forEach((spider, index) => {
			const card = document.createElement("article");
			const img = document.createElement("img");
			const title = document.createElement("h2");
			const desc = document.createElement("p");
			const likeBtn = document.createElement("button");
			const pageNumber = document.createElement("span");

			img.src = IMAGE_BASE_URL + spider.spiderImage;
			img.alt = `Image of ${spider.spiderName}`;
			title.textContent = spider.spiderName;
			desc.textContent = spider.facts;
			likeBtn.classList.add("heart-btn");
			likeBtn.innerHTML = "❤";
			likeBtn.disabled = !userLoggedIn;
			if (!userLoggedIn) {
				likeBtn.classList.add("disabled");
			} else {
				likeBtn.classList.remove("disabled");
			}
			pageNumber.textContent = `Page ${index + 1} of ${spiderArray.length}`;
			pageNumber.classList.add("page-number");

			likeBtn.addEventListener("click", (event) => {
				if (userLoggedIn) {
					likeBtn.classList.toggle("liked");
				}
				event.stopPropagation();
			});

			card.appendChild(img);
			card.appendChild(title);
			card.appendChild(desc);
			card.appendChild(likeBtn);
			card.appendChild(pageNumber);
			carousel.appendChild(card);
			likeBtn.addEventListener("click", async (event) => {
				if (userLoggedIn) {
					const spiderId = spider.spiderId;
					await toggleSpiderLike(userID, spiderId, likeBtn);
				} else {
					console.log("User is not logged in. Unable to toggle spider like.");
				}
				event.stopPropagation();
			});
			card.addEventListener("click", () => {
				document
					.querySelectorAll("#carousel article")
					.forEach((c) => c.classList.remove("active"));
				card.classList.add("active");
				centerCard(card);
			});

			if (index === 0) {
				card.classList.add("active");
			}
		});

		if (carousel.children.length > 0) {
			centerCard(carousel.children[0]);
		}
	}

	function centerCard(selectedCard) {
		const carousel = document.getElementById("carousel");
		const activeCardOffset =
			selectedCard.offsetLeft + selectedCard.offsetWidth / 2;
		const shift = carousel.offsetWidth / 2 - activeCardOffset;
		carousel.style.transform = `translateX(${shift}px)`;
	}

	checkLoginAndRenderCards();

	window.addEventListener("resize", () => {
		if (window.innerWidth < 768) {
			navUsername.style.display = "none";
		} else {
			navUsername.style.display = navUsername.textContent ? "inline" : "none";
		}
	});
	const sortByNameLink = document.querySelector('a[href="#about"]');
	sortByNameLink.addEventListener("click", sortSpidersByName);

	function sortSpidersByName() {
		fetchSpidersInfo().then((spiders) => {
			if (ascendingOrder) {
				spiders.sort((a, b) => a.spiderName.localeCompare(b.spiderName));
			} else {
				spiders.sort((a, b) => b.spiderName.localeCompare(a.spiderName));
			}
			ascendingOrder = !ascendingOrder;
			renderSpiderCards(spiders, false);
		});
	}

	const searchButton = document.querySelector(".search-btn");
	searchButton.addEventListener("submit", function (event) {
		event.preventDefault();
		searchSpider();
	});
	async function filterLikedSpiders() {
		try {
			console.log("Filter Liked Spiders function called");

			spiders = await fetchSpidersInfo();

			const response = await fetch(
				`http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5001/api/user-favorites/${userID}`
			);

			if (!response.ok) {
				throw new Error("Failed to fetch user's favorite spiders.");
			}

			const favoriteSpiders = await response.json();
			"Favorite spiders:", favoriteSpiders;

			const likedSpiderIds = favoriteSpiders.map((spider) => spider.spiderId);
			const likedSpiders = spiders.filter((spider) =>
				likedSpiderIds.includes(spider.spiderId)
			);

			renderSpiderCards(likedSpiders, true);
		} catch (error) {
			console.error("Error filtering liked spiders:", error);
		}
	}
});
function searchSpider() {
	const searchText = document.getElementById("searchInput").value.toLowerCase();
	const pages = document.querySelectorAll("#carousel article");
	let found = false;
	for (let i = 0; i < pages.length; i++) {
		const spiderName = pages[i].querySelector("h2").textContent.toLowerCase();
		if (spiderName.includes(searchText)) {
			currentPage = i;
			moveCarousel(pages[i]);
			found = true;
			break;
		}
	}
	if (!found) alert("No spider found with that name.");
}

function moveCarousel(selectedCard) {
	const carousel = document.getElementById("carousel");
	const activeCardOffset =
		selectedCard.offsetLeft + selectedCard.offsetWidth / 2;
	const shift = carousel.offsetWidth / 2 - activeCardOffset;
	carousel.style.transform = `translateX(${shift}px)`;
}

function resetPage() {
	document.getElementById("searchInput").value = "";
	const pages = document.querySelectorAll("#carousel article");
	pages.forEach((page) => {
		page.style.display = "block";
	});

	const activeCard = document.querySelector("#carousel article.active");
	if (activeCard) {
		activeCard.classList.remove("active");
	}
	const firstCard = document.querySelector("#carousel article");
	if (firstCard) {
		firstCard.classList.add("active");
		moveCarousel(firstCard);
	}
}

async function toggleSpiderLike(userId, spiderId, likeBtn) {
	try {
		const url =
			"http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5001/api/favorite-spider";
		const bodyData = JSON.stringify({ userId, spiderId });

		const headers = {
			"Content-Type": "application/json",
			"Content-Length": bodyData.length.toString(),
			Host: "ec2-3-250-137-103.eu-west-1.compute.amazonaws.com",
		};

		const response = await fetch(url, {
			method: "POST",
			headers: headers,
			body: bodyData,
		});

		if (response.ok) {
			alert("Added a spider to favourites");
			likeBtn.classList.toggle("liked");
		} else {
			const errorMessage = await response.text();
			console.error("Error toggling spider like:", errorMessage);
			if (errorMessage.includes("Spider already favorited by the user")) {
				alert("Spider is already favorited!");
			}
		}
	} catch (error) {
		console.error("Error toggling spider like:", error);
	}
}

async function getUserId(username) {
	try {
		const response = await fetch(
			`http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5001/api/user-id/${username}`
		);
		const data = await response.json();

		if (response.ok) {
			console.log(data.userId);
			return data.userId;
		} else {
			throw new Error(data.message || "Failed to fetch user ID");
		}
	} catch (error) {
		console.error("Error fetching user ID:", error);
		throw error;
	}
}
