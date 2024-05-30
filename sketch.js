/*
 * Made by Sajid
 * Reference: https://codepen.io/ju-az/pen/eYJQwLx
 */

var c;
var sprite_flappy;
var sprite_pipe;
var sprite_city;
var sprite_floor;
var sprite_title;
var zoomFactor = 4; // Zoom the city background by 4 times
var snowFall = false;
var sound_point;
var sound_wing;
var sound_hit;
var sound_die;
var sound_sweetwing;

var font_flappy;

var pipes = [];

var score = 0;
var hightscore = 0;
var speed = 3;
var gap = 50;

var gameover = false;
var page = "MENU";

var overflowX = 0;
var startgame = false;

// for handpose model
var video;
var handpose;
var detections = [];

var thresholdUp = null;
var previousGesture = null;
var thresholdRight = null;

// to zoom the bg
var zoomFactor = 1.5;

// Snowflake
var snowing = false; // Variable to track if it is snowing
let snowflakes = []; // Array to hold the snowflake objects
var snowBackground; // used to decrease alpha value of background image

// Flappy bird sprite object
var flappy_bird = {
  
  x : 100,
  y : 0,
  target : 0,
  velocityY : 0,
  fly : false,
  angle : 0,
  
  falls : false,
  flashAnim : 0,
  flashReturn : false,
  kinematicAnim : 0,
  
  // Method that helps display the flappy bird object
  display : function() {
    
    if((thresholdUp === "fall") || this.falls) {
      thresholdUp == null;
      push();
        translate(this.x,this.y);
        rotate(radians(40));
        image(sprite_flappy,0,0, sprite_flappy.width*1.5,sprite_flappy.height*3, 0,0 ,sprite_flappy.width/2,sprite_flappy.height*3);
      pop();
    }
    else {
      push();
        translate(this.x,this.y);
        radians(this.angle);
        image(sprite_flappy,0,0, sprite_flappy.width*1.5,sprite_flappy.height*3, sprite_flappy.width/2,0 ,sprite_flappy.width/2,sprite_flappy.height*3);
      pop();
    }
  },
  
  update : function() { // updates the position of the flappy bird
    if(this.falls) {
      if(this.flashAnim>255) {
        this.flashReturn = true;
      }
      
      if(this.flashReturn) {
        this.flashAnim -=60;
      }
      else {
        this.flashAnim +=60;
      }
      
      if(this.flashReturn && this.flashAnim === 0) {
        gameover = true;
        menu_gameover.easein();
        try { sound_die.play(); } catch(e) {}
        
        if(score > hightscore) { hightscore = score; }
      }
      
      this.y += this.velocityY;
      this.velocityY += 0.4;
      this.angle += 4;
      
      if(speed > 0) {
        speed = 0;
      }
      
      if(this.angle > 90) {
        this.angle = 90;
      }
    }
    else {
      this.y += this.velocityY;
      this.angle += 2.5;
    
      if(this.angle > 90) {
        this.angle = 90;
      }
    
      if(thresholdUp=== "fly") {
        try { sound_wing.play(); } catch(e) {}
        
        this.velocityY = 0;
        this.fly = true;
        this.target = clamp(this.y - 60,-19,height);
        this.angle = -45;
      }
    
    
      if(this.y < this.target) {
        this.fly = false;
        this.target = 10000;
      }
    
    
      if(!this.fly) {
        this.velocityY+=0.4;
      }
      else {
        this.y -= 5;
      }
      
      if(this.y > height-49) {
        if(!flappy_bird.falls) { try { sound_hit.play(); } catch(e) {} }
        this.falls = true;
      }
    }
    this.y = clamp(this.y,-20,height-50);
  },
  
  kinematicMove : function() { // helps move the bird
    if(gameover) {
      this.x = width/2;
      this.y = height/2;
      
      gameover = false;
      score = 0;
      gap = 90;
    }
    
    this.y = height/2 + map( sin(frameCount*0.1),0,1,-2,2 );
	
    push();
      translate(this.x,this.y);
      image(sprite_flappy,0,0, sprite_flappy.width*1.5,sprite_flappy.height*3, 0,0 ,sprite_flappy.width/2,sprite_flappy.height*3);
    pop();
  }
}

// Loads our winter mode background
function preload() { 
  snowBackground = loadImage('assets/image/winter.png');
}

// Setup function to initialize before gameplay
function setup() {
  
  c = createCanvas(600,800, WEBGL);

  imageMode(CENTER);
  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER,CENTER);
  video = createCapture(VIDEO);
  video.id("video");
  video.size(width/2 + 100, height/2);
  const options = {
    flipHorizontal: false, 
    maxContinuousChecks: Infinity, 
    detectionConfidence: 0.8,
    scoreThreshold: 0.75,
    iouThreshold: 0.3, 
  }

  noSmooth();
  
  pipes[0] = new Pipe();

  //load
  sprite_flappy = loadImage('assets/image/phoenix.png');
  sprite_pipe = loadImage('assets/image/bellTower.png');
  sprite_city = loadImage('assets/image/swatParrish.png');
  sprite_city2 = loadImage('assets/image/test.png');
  sprite_city3 = loadImage('assets/image/test2.png');
  sprite_floor = loadImage('assets/image/tileMain.png');
  sprite_title = loadImage('assets/image/swatTitle.png');
  
  
  sound_point = loadSound('assets/sounds/sfx_point.wav');
  sound_carter = loadSound('assets/sounds/sfs_point.wav');
  sound_hit = loadSound('assets/sounds/sfx_hit.wav');
  sound_die = loadSound('assets/sounds/sfx_die.wav');
  sound_wing = loadSound('assets/sounds/sfx_hawks.wav');
  sound_sweetwing = loadSound('assets/sounds/sfx_swooshing.wav');
  
  
  font_flappy = loadFont('assets/flappy-font.ttf');
  
  flappy_bird.y = height/2;
  try { textFont(font_flappy); } catch(e) {}
  // handpose
  handpose = ml5.handpose(video, options, modelReady);
  colorMode(HSB);
}

// Callback for when model is ready to predict hand location
function modelReady() {
  console.log("Model ready!");
  handpose.on('predict', results => {
    detections = results;
    detectGesture();
  });
}

function ss(data) {
  console.log(data);
}

// Main loop that draws the gameplay and controls what screen to display
function draw() {
  clear();
  translate(-width/2, -height/2);
  colorMode(HSB);
  background(210, 80, 238);

  switch(page) {
    case 'GAME':
      page_game();
      break;
    case 'MENU':
      page_menu();
      break;
  }

  if (snowing) { // Check if it's snowing
    drawSnow(); // Draw snowflakes and dim the background
  }
}

// Function to draw our random snow and dim the background using the alpha value
function drawSnow() {
  for (let i = 0; i < random(5); i++) {
    snowflakes.push(new snowflake()); // Create snowflake objects
  }

  // Loop through snowflakes with a for..of loop
  for (let flake of snowflakes) {
    flake.update(); // Update snowflake position
    flake.display(); // Draw snowflake
  }

  // Dims  snow background image
  snowBackground.loadPixels(); 
  for (let i = 0; i < snowBackground.pixels.length; i += 4) {
    // Decreases alpha value of the pixels
    snowBackground.pixels[i+3] -= 50;
  }
  snowBackground.updatePixels(); 
  image(snowBackground, width / 2, height / 2, width, height); // Draws new background image
}

// Function to turn snowing on / off
function toggleSnowing() {
  snowing = !snowing;
}

// Snowflake class
function snowflake() {
  // Initializes coordinates
  this.posX = random(width); // Random X position
  this.posY = random(-50, 0); // Random Y position
  this.initialangle = random(0, 2 * PI); // Random initial angle
  this.size = random(2, 5); // Random size

  // Radius of snowflake spiral
  // Chosen so the snowflakes are uniformly spread out in area
  this.radius = sqrt(random(pow(width / 2, 2)));

  this.update = function() {
    // X position follows a circle
    let w = 0.6; // Angular speed
    let angle = w * frameCount / 60 + this.initialangle;
    this.posX = width / 2 + this.radius * sin(angle);

    // Different size snowflakes fall at slightly different Y speeds
    this.posY += pow(this.size, 0.5);

    // Delete snowflake if past end of screen
    if (this.posY > height) {
      let index = snowflakes.indexOf(this);
      snowflakes.splice(index, 1);
    }
  };

  this.display = function() {
    fill(240);
    noStroke();
    ellipse(this.posX, this.posY, this.size);
  };
}

function keyPressed() {
  if (key === 'w' || key === 'W') { 
    snowFall = true;
    sprite_city = loadImage('assets/image/winter.png');
    toggleSnowing();
  }
}

// Function to detect user's hand gestures
function detectGesture() {
  if (detections.length > 0) {
    // Calculate thumb and index finger tip positions
    let thumbTip = detections[0].landmarks[4];
    let indexTip = detections[0].landmarks[8];

    // Calculate distance between thumb and index finger tips
    let distance = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);

    // If distance is smaller than threshold and thumb is above index finger, consider it as a opening of the hand
    if (distance < 100) {
      if (previousGesture !== "open-hand") {
        previousGesture = "open-hand";
      }
    } else {
      if (previousGesture !== "not-open") {
        previousGesture = "not-open";
      }
    }

    // Check if index finger crosses more than two-thirds of the height
    let thresholdHeight = height/2 * (2/3);
    if (indexTip[1] < thresholdHeight - 20) {
      if (thresholdUp !== "fly") {
        thresholdUp = "fly";
      }
    }else{
      if (thresholdUp !== "fall") {
        thresholdUp = "fall";
      }
    }
    let thresholdWidth = width/2 + 100 * (2/3);
    for (let i = 0; i < detections[0].landmarks.length; i++) {
      let landmark = detections[0].landmarks[i];
      if (landmark[0] > thresholdWidth + 30) {
        if (thresholdRight !== "right") {
          thresholdRight = "right";
        }
      }
      else{
        if (thresholdRight !== "left") {
          thresholdRight = "left";
        }
      }
    }
  }
}

// Renders the game page
function page_game() {
  overflowX += speed;
  if(overflowX > sprite_city.width/2) {
    overflowX = 0;
  }
  
  //City
  //image(sprite_city, sprite_city.width/2/2 ,height-sprite_city.height/2/2-40,sprite_city.width/2,sprite_city.height/2);
  if (snowFall=== true){
    image(sprite_city3, width/2, height/2, width, height);
  }else{
    image(sprite_city2, width/2, height/2, width, height);
  }
  
  //creator
  if(!flappy_bird.falls) {
    if(parseInt(frameCount)%70 === 0) {
      pipes.push(new Pipe());
    }
  }
  
  for(var i=0; i<pipes.length; i++) {
    if(pipes[i].x < -50) {
      pipes.splice(i,1);
    }
    
    try {
      pipes[i].display();
      pipes[i].update();
    } catch(e) {}
  }
  
  //Floor
  image(sprite_floor,sprite_floor.width-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  image(sprite_floor,sprite_floor.width+sprite_floor.width-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  image(sprite_floor,sprite_floor.width+sprite_floor.width*2-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  
  flappy_bird.display();
  flappy_bird.update();
  flappy_bird.x = smoothMove(flappy_bird.x, 90, 0.02);

    // Score
  if (!gameover) {
    push();
      stroke(0);
      strokeWeight(5);
      fill(255);
      textSize(30);
      text(score, width / 2, 50);
    pop();
  }

  push();
    noStroke();
    fill(255, flappy_bird.flashAnim);
    rect(width / 2, height / 2, width, height);
    pop();

  if (gameover) {
    menu_gameover.display();
    menu_gameover.update();
  }
}

// Creates our menu page
function page_menu() {
  
  speed = 1;
  overflowX += speed;
  if(overflowX > sprite_city.width/2) {
    overflowX = 0;
  }
  // City with zoom and continuous horizontal movement in menu
  image(sprite_city, width - overflowX, height / 2, sprite_city.width * zoomFactor, sprite_city.height * zoomFactor+80);
  
  //Floor
  image(sprite_floor,sprite_floor.width-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  image(sprite_floor,sprite_floor.width+sprite_floor.width-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  image(sprite_floor,sprite_floor.width+sprite_floor.width*2-overflowX,height-sprite_floor.height ,sprite_floor.width*2,sprite_floor.height*2);
  
  image(sprite_title,width/2,100,sprite_title.width/4,sprite_title.height/4);
  
  flappy_bird.kinematicMove();
  
  push();
    fill(200); 
    textSize(24); 
    text('Swipe your hand left to begin!', width/2, height/2 - 70);
    text('Press W for winter mode', width/2, height/2 - 30);

  pop();

  
  if(thresholdRight === "right" ) {
  	page = "GAME";
    thresholdRight = null;
    resetGame();
  	
  	flappy_bird.velocityY = 0;
    flappy_bird.fly = true;
    flappy_bird.target = clamp(this.y - 60,-19,height);
    flappy_bird.angle = -45;
    flappy_bird.update();
  }
  flappy_bird.x = width/2;
	
}

function Pipe() {
  
  this.gapSize = gap + 150;
  this.y = random(150,height-150);
  this.x = width + 50;
  this.potential = true;
  
  this.display = function() {
    push();
      translate(this.x,this.y+this.gapSize+sprite_pipe.height/2/2);
      image(sprite_pipe, 0,0 ,sprite_pipe.width/2,sprite_pipe.height/2);
    pop();
    
    push();
      translate(this.x,this.y-this.gapSize-sprite_pipe.height/2/2);
      rotate(radians(180));
      scale(-1,1);
      image(sprite_pipe,0,0,sprite_pipe.width/2,sprite_pipe.height/2);
    pop();
    
    //Score
    if(this.potential && (flappy_bird.x > this.x-25 && flappy_bird.x < this.x+25)) {
      score++;
      try { sound_point.play(); } catch(e) {}
      
      if(gap > 60) { gap--; }
      //if(speed < 20) { speed+=0.1; }
      
      this.potential = false;
    }
    
    //Pipes collisions
    if( ( 
        (flappy_bird.x+20 > this.x-25 && flappy_bird.x-20 < this.x+25) && 
        (flappy_bird.y+20 > (this.y-this.gapSize-sprite_pipe.height/2/2)-200 && flappy_bird.y-20 < (this.y-this.gapSize-sprite_pipe.height/2/2)+200)
        )
        
        ||
        
        ( 
        (flappy_bird.x+20 > this.x-25 && flappy_bird.x-20 < this.x+25) && 
        (flappy_bird.y+20 > (this.y+this.gapSize+sprite_pipe.height/2/2)-200 && flappy_bird.y-20 < (this.y+this.gapSize+sprite_pipe.height/2/2)+200)
        )
        
        ) {
      
      if(!flappy_bird.falls) { try { sound_hit.play(); } catch(e) {} }
      flappy_bird.falls = true;
    }
  }
  this.update = function() {
    this.x-= speed;
  }
}

//utility
function clamp(value,min,max) {
  
  if(value < min) {
    value = min;
  }
  if(value > max) {
    value = max;
  }
  
  return value;
}

// Resets our game state
function resetGame() {
  gameover = false;
  gap = 100;
  speed = 3;
  score = 0;
  flappy_bird.y = height/2
  flappy_bird.falls = false;
  flappy_bird.velocityY = 0;
  flappy_bird.angle = 0;
  flappy_bird.flashAnim = 0;
  flappy_bird.flashReturn = false;
  pipes = [];
  flappy_bird.target = 10000;
  menu_gameover.ease = 0;
  thresholdUp = null;
  thresholdRight = null;
  previousGesture = null;
  snowFall = false;
  snowing = false;
}

//Menu Gameover
var menu_gameover = {
  
  ease : 0,
  easing : false,
  open : false,
  
  display : function() {
    
    push();
      translate(width/2,height/2);
      scale(this.ease);
      
      stroke(83,56,71);
      strokeWeight(2);
      fill(222,215,152);
      rect(0,0,300,200); // Enlarged restart box
      
      noStroke();
      fill(65, 186, 115); // Greenish color like the pipes
      text('by Carter & Sajid',0,-50);
      
      //Title
      textSize(24); // Increased title font size
      strokeWeight(5);
      stroke(83,56,71);
      fill(255);
      text('Swatty Phoenix',0,-90);
      // Display message instead of restart button
      textSize(20); // Increased message font size
      noStroke();
      fill(65, 186, 115); // Greenish color like the pipes
      text("Open hand to", 0, -20);
      text("play again", 0, 10); // Stacked text
      
      //Info
      push();
        textAlign(LEFT,CENTER);
        textSize(18); // Increased info font size
        noStroke();
        fill(65, 186, 115); // Greenish color like the pipes
        text('score : ',-80, 40);
        text('hightscore : ',-80, 70);
        
        stroke(0);
        strokeWeight(3);
        fill(255);
        text(score,40,40); // Adjusted position of score
        text(hightscore,60,70); // Adjusted position of highscore
      pop();
      if(press('restart',0,140,width/2,height/2)) { 
        resetGame();
      }
    pop();
  },
  
  update : function() {
    if(this.easing) {
      this.ease += 0.1;
      if(this.ease > 1) {
        this.open = true;
        this.ease = 1;
        this.easing = false;
      }
    }
  },
  
  easein : function() {
    this.easing = true;
  }
}

function press(txt,x,y,tX,tY) {
  var this_h = false;
  
  if(previousGesture === "not-open") {
    this_h = true;
    previousGesture == null;
  }
  
  push();
    textSize(16);
    
    if(this_h) {
      noStroke();
      fill(83,56,71);
      rect(x,y+3,textWidth(txt)+25+10,textAscent()+10+10);
      
      fill(250,117,49);
      stroke(255);
      strokeWeight(3);
      rect(x,y+2,textWidth(txt)+25,textAscent()+10);
    
      noStroke();
      fill(255);
      text(txt,x,y+2);
    }
    else {
    noStroke();
    fill(83,56,71);
    rect(x,y+2,textWidth(txt)+25+10,textAscent()+10+12);
    
    if(this_h) {
      fill(250,117,49);
    }
    else {
      fill(230,97,29);
    }
    stroke(255);
    strokeWeight(3);
    rect(x,y,textWidth(txt)+25,textAscent()+10);
    
    noStroke();
    fill(255);
    text(txt,x,y);
    }
  pop();
  
  if(this_h) { try { sound_sweetwing.play(); } catch(e) {} }
  
  return (this_h);
}

function smoothMove(pos,target,speed) { // 'smoothly' moves object
	return pos + (target-pos) * speed;
}
