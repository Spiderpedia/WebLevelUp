const express = require("express");
const expressSession = require("express-session");
const passport = require("passport");
const cors = require("cors");
const GitHubStrategy = require("passport-github").Strategy;
const userRouter = require("./user");
const path = require("path");
const isProduction = process.env.NODE_ENV === "production";
require("dotenv").config();
const pool = require("./DB");
const app = express();
app.use(express.json());
const corsOptions = {
	origin: "http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:5000",
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Session Configuration
app.use(
	expressSession({
		secret: process.env.GITHUB_SECRET || "default-secret-key",

		resave: false,

		saveUninitialized: false,
	})
);

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub OAuth Strategy
passport.use(
	new GitHubStrategy(
		{
			clientID: isProduction
				? process.env.PROD_GITHUB_ID
				: process.env.LOCAL_GITHUB_ID,

			clientSecret: isProduction
				? process.env.PROD_GITHUB_SECRET
				: process.env.LOCAL_GITHUB_SECRET,

			callbackURL: isProduction
				? `http://ec2-3-250-137-103.eu-west-1.compute.amazonaws.com:${
						process.env.PORT || 5000
				  }/callback`
				: `http://localhost:${process.env.PORT || 5000}/callback`,
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const user = await findOrCreateUser(profile);
				done(null, profile);
			} catch (error) {
				done(error);
			}
		}
	)
);

async function findOrCreateUser(profile) {
	// const client = await pool.connect();
	const emailAddress = "test@gmail.com";
	// const emailAddress = profile.emails && profile.emails[0].value;

	try {
		// Check if the user already exists
		// const result = await client.query('SELECT * FROM "User" WHERE "githubId" = $1', [profile.id]);
		const result = await pool.query(
			'SELECT * FROM "User" WHERE "githubId" = $1',
			[profile.id]
		);
		if (result.rows.length > 0) {
			// User exists
			return result.rows[0];
		} else {
			// Insert new user
			const newUser = await pool.query(
				'INSERT INTO "User" ("emailAddress", "username", "githubId") VALUES (DEFAULT,$1, $2, $3) RETURNING *',
				[emailAddress, profile.username, profile.id]
			);
			return newUser.rows[0];
		}
	} catch (error) {
		console.log(error);
	}
}

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

// Serving static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
app.get("/", (req, res) => {
	res.sendFile("index.html", { root: path.join(__dirname, "../frontend") });
});

app.get("/login", passport.authenticate("github"));

app.get(
	"/callback",
	passport.authenticate("github", { failureRedirect: "/" }),
	(req, res) => {
		res.redirect("/");
	}
);

app.get("/logout", (req, res, next) => {
	req.logout((err) => {
		if (err) {
			return next(err);
		}
		res.redirect("/");
	});
});

app.get("/user", (req, res) => {
	if (req.isAuthenticated()) {
		res.json({ username: req.user.username });
	} else {
		res.json("Not logged in");
	}
});

// API Routes
app.use("/api", userRouter);

// Server setup
const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}`));
