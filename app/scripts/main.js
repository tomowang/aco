/* jshint undef: true, unused: true */
/* global _, d3, dat */

(function () {
  "use strict";
  var app = app || {},
    PI = Math.PI, sin = Math.sin,
    radius = 30, dx,
    width, height, padding = 5, colony = [],
    map, svg;

  dx = radius * 2 * sin(PI / 3);
  height = radius * 15 + padding * 2;
  width = dx * 20 + padding * 2;

  svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("padding", padding + "px");

  app.Ant = function (point, j) {
    var i;
    if (!_.isUndefined(j)) {
      i = point;
      point = map.matrix[i][j];
    }
    this.timer = null;
    this.point = point;
    this.trail = [];
    this.node = svg
      .append("circle")
      .attr("class", "ant")
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("r", 3);

    this.go = function (p, j) {
      if (!_.isUndefined(j)) {
        i = p;
        p = map.matrix[i][j];
      }
      this.trail.push(this.point.index);
      this.point = p;
      this.node.transition()
        .attr("cx", p[0])
        .attr("cy", p[1]);
    };

    this.start = function () {
      var _self = this;
      this.stop();
      this.timer = setInterval(function () {
        var next = [], trail = _self.trail;
        _.each(_self.point.next, function (p) {
          if (_.indexOf(trail, p.index) === -1){
            next.push(p);
          }
        });
        if (next.length === 0) {
          next = _self.point.next;
        }
        _self.go(next[_.random(next.length - 1)]);
      }, 300);
    };

    this.stop = function () {
      this.timer && clearInterval(this.timer);
    };

    this.destroy = function () {
      this.stop();
      this.node && this.node.remove();
    };
  };
  app.ACO = function () {
    this.count = 100; // count of ants
    this.alpha = 0.5; // a parameter to control the influence of \tau_{xy}
    this.beta = 1; // a parameter to control the influence of \eta_{xy}
    this.rho = 0.5; // the pheromone evaporation coefficient
    this.q = 0; // constant to calculate \tau
    this._started = false;
    this.initColony = function () {
      for (var i = 0; i < this.count; i++) {
        colony.push(new app.Ant(0, 0));
      }
    };
    this['start/stop'] = function () {
      colony.length !== this.count && this.initColony();
      for (var i = 0; i < this.count; i++) {
        this._started ? colony[i].stop() : colony[i].start();
      }
      this._started ? this._started = false : this._started = true;
    };
    this.destroy = function () {
      for (var i = 0; i < this.count; i++) {
        colony[i].destroy();
      }
      colony = [];
      this._started = false;
    };
  };
  Object.defineProperty(app.ACO.prototype, 'type', {
    get: function () {
      return this._type || null;
    },
    set: function (type) {
      type && (this.destroy(), map.type = this._type = type);
    }
  });


  app.Map = function () {};
  Object.defineProperty(app.Map.prototype, 'type', {
    get: function () {
      return this._type;
    },
    set: function (type) {
      this._type = type;
      this.init();
      this.construct();
    }
  });
  app.Map.prototype.init = function () {
    this.matrix = [];
    this.points = [];
    this.edges = [];
  };
  app.Map.prototype.construct = function () {
    switch (this.type) {
      case "triangle":
        this.constructTriangle();
        break;
      case "square":
        this.constructSquare();
        break;
      case "hexagon":
      default:
        this.constructHexagon();
        break;
    }
    this.buildMap();
  };
  app.Map.prototype.constructSquare = function () {
    var _self = this,
      point, i, j, x, y;
    for (i = 0, y = padding; y < height - padding; y += radius * 2, i++) {
      for (j = 0, x = padding; x <= width - padding; x += radius * 2, j++) {
        point = [x, y];
        point.i = i;
        point.j = j;
        point.index = [i, j];
        point.next = []; // allowed next points
        if (_.isUndefined(_self.matrix[i])) {
          _self.matrix[i] = [];
        }
        _self.matrix[i][j] = point;
        _self.points.push(point);
      }
    }
    _.each(_self.matrix, function (r, i) {
      _.each(r, function (p, j) {
        if (_self.matrix[i + 1] && _self.matrix[i + 1][j]) {
          _self.edges.push([p, _self.matrix[i + 1][j]]);
        }
        if (_self.matrix[i][j + 1]) {
          _self.edges.push([p, _self.matrix[i][j + 1]]);
        }
      });
    });
    _.each(_self.edges, function (e) {
      _self.matrix[e[0].i][e[0].j].next.push(_self.matrix[e[1].i][e[1].j]);
      _self.matrix[e[1].i][e[1].j].next.push(_self.matrix[e[0].i][e[0].j]);
    });
  };
  app.Map.prototype.constructHexagon = function () {
    var _self = this,
      point, i, j, x, y;
    for (i = 0, y = padding; y < height - padding; y += i % 2 ? radius : radius / 2, i++) {
      for (j = 0, x = (i % 4 === 0 || i % 4 === 3 ? dx / 2 : 0) + padding; x <= width - padding; x += dx, j++) {
        point = [x, y];
        point.i = i;
        point.j = j;
        point.index = [i, j];
        point.next = []; // allowed next points
        if (_.isUndefined(_self.matrix[i])) {
          _self.matrix[i] = [];
        }
        _self.matrix[i][j] = point;
        _self.points.push(point);
      }
    }
    _.each(_self.matrix, function (r, i) {
      _.each(r, function (p, j) {
        if (_self.matrix[i + 1] && _self.matrix[i + 1][j]) {
          _self.edges.push([p, _self.matrix[i + 1][j]]);
        }
        if (i % 4 !== 2 && i % 2 === 0 && _self.matrix[i + 1] && _self.matrix[i + 1][j + 1]) {
          _self.edges.push([p, _self.matrix[i + 1][j + 1]]);
        }
        if (i % 4 === 2 && _self.matrix[i + 1] && _self.matrix[i + 1][j - 1]) {
          _self.edges.push([p, _self.matrix[i + 1][j - 1]]);
        }
      });
    });
    _.each(_self.edges, function (e) {
      _self.matrix[e[0].i][e[0].j].next.push(_self.matrix[e[1].i][e[1].j]);
      _self.matrix[e[1].i][e[1].j].next.push(_self.matrix[e[0].i][e[0].j]);
    });
  };
  app.Map.prototype.constructTriangle = function () {
    var _self = this,
      point, i, j, x, y;
    for (i = 0, y = padding; y < height - padding; y += radius, i++) {
      for (j = 0, x = (i % 2 === 0 ? dx : 0) + padding; x <= width - padding; x += dx * 2, j++) {
        point = [x, y];
        point.i = i;
        point.j = j;
        point.index = [i, j];
        point.next = []; // allowed next points
        if (_.isUndefined(_self.matrix[i])) {
          _self.matrix[i] = [];
        }
        _self.matrix[i][j] = point;
        _self.points.push(point);
      }
    }
    _.each(_self.matrix, function (r, i) {
      _.each(r, function (p, j) {
        if (_self.matrix[i + 1] && _self.matrix[i + 1][j]) {
          _self.edges.push([p, _self.matrix[i + 1][j]]);
        }
        if (i % 2 === 0 && _self.matrix[i + 1] && _self.matrix[i + 1][j + 1]) {
          _self.edges.push([p, _self.matrix[i + 1][j + 1]]);
        }
        if (i % 2 !== 0 && _self.matrix[i + 1] && _self.matrix[i + 1][j - 1]) {
          _self.edges.push([p, _self.matrix[i + 1][j - 1]]);
        }
        if (_self.matrix[i + 2] && _self.matrix[i + 2][j]) {
          _self.edges.push([p, _self.matrix[i + 2][j]]);
        }
      });
    });
    _.each(_self.edges, function (e) {
      _self.matrix[e[0].i][e[0].j].next.push(_self.matrix[e[1].i][e[1].j]);
      _self.matrix[e[1].i][e[1].j].next.push(_self.matrix[e[0].i][e[0].j]);
    });
  };
  app.Map.prototype.buildMap = function () {
    svg.selectAll(".node").remove();
    svg.selectAll(".link").remove();
    var _self = this;

    svg.selectAll(".node")
      .data(_self.points)
      .enter().append("circle")
      .attr("class", "node")
      .attr("cx", function (d) { return d[0]; })
      .attr("cy", function (d) { return d[1]; })
      .attr("r", 2);

    svg.selectAll(".link")
      .data(_self.edges)
      .enter().append("line")
      .attr("class", "link")
      .attr("x1", function (d) { return d[0][0]; })
      .attr("y1", function (d) { return d[0][1]; })
      .attr("x2", function (d) { return d[1][0]; })
      .attr("y2", function (d) { return d[1][1]; });
  };

  map = new app.Map();
  map.type = "triangle";

  window.onload = function() {
    var aco = new app.ACO();
    var gui = new dat.GUI();
    gui.add(aco, 'type', ['triangle', 'square', 'hexagon']);
    gui.add(aco, 'count', 10, 200).step(10);
    gui.add(aco, 'alpha', 0, 1).step(0.01);
    gui.add(aco, 'beta', 1, 10).step(0.1);
    gui.add(aco, 'rho', 0, 1).step(0.01);
    gui.add(aco, 'start/stop');
    gui.add(aco, 'destroy');
    gui.remember(aco);
  };
})();
