document.addEventListener("DOMContentLoaded", function () {
  function calculateMedalScore(olympicData) {
    return (
      +olympicData.gold * 0.6 +
      +olympicData.silver * 0.3 +
      +olympicData.bronze * 0.1
    );
  }

  function determineDemocraticStatus(freedomData) {
    if (!freedomData) return "unknown";
    const democracyScore = parseFloat(freedomData["Democracy score"]);
    return democracyScore > 6 ? "democratic" : "authoritarian";
  }

  // Load both datasets
  Promise.all([
    d3.text("Data/2023_country_information.csv"),
    d3.text("Data/democracy-index-eiu.csv"),
    d3.text("Data/2024_olympics.csv"),
  ]).then(function (files) {
    const data1 = d3.csvParse(files[0]);
    const data2 = d3.csvParse(files[1]);
    const data3 = d3.csvParse(files[2]);

    // Merge datasets
    const mergedData = data3.map((olympic) => {
      const countryData = data1.find(
        (country) =>
          country.Country.trim().toLowerCase() ===
          olympic.country.trim().toLowerCase()
      );

      const freedomData = data2.find(
        (freedom) =>
          (freedom.Entity.trim().toLowerCase() ===
            olympic.country.trim().toLowerCase() &&
            freedom.Year === "2023") ||
          (freedom.Code.trim().toLowerCase() ===
            olympic.country_code.trim().toLowerCase() &&
            freedom.Year === "2023")
      );

      return {
        ...olympic,
        ...(countryData || {}),
        ...(freedomData || {}),
        medalScore: calculateMedalScore(olympic),
        democraticStatus: determineDemocraticStatus(freedomData),
      };
    });
    console.log(mergedData);

    // Visualization setup
    const margin = { top: 20, right: 200, bottom: 50, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 525 - margin.top - margin.bottom;

    const svg = d3
      .select("#chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Create legend container
    const legendContainer = d3
      .select("#chart")
      .append("div")
      .attr("id", "legend-container")
      .style("position", "absolute")
      .style("top", `${margin.top}px`)
      .style("left", `${width + margin.left + 10}px`);

    // Animation function for scatter plot
    function animateScatterPlot(xAxis) {
      // Clear previous chart
      svg.selectAll("*").remove();

      // Clear previous external legend
      legendContainer.html("");

      // X-axis scale configuration
      const xScaleConfig = {
        gdp: {
          accessor: (d) => +d.gdp * d.population * 1e6,
          label: "GDP",
          filter: (value) => value !== null && value !== 0 && !isNaN(value),
        },
        population: {
          accessor: (d) => +d.population * 1e6,
          label: "Population",
          filter: (value) => value !== null && value !== 0 && !isNaN(value),
        },
        land: {
          accessor: (d) => {
            const value = d["Land Area(Km2)"];
            return value ? +value.replace(/,/g, "") : null;
          },
          label: "Land area",
          filter: (value) => value !== null && value !== 0 && !isNaN(value),
        },
        cpi: {
          accessor: (d) => +d["CPI"],
          label: "CPI",
          filter: (value) => value !== null && value !== 0 && !isNaN(value),
        },
      };

      const currentConfig = xScaleConfig[xAxis];

      const filteredData = mergedData.filter((d) => {
        const value = currentConfig.accessor(d);
        return currentConfig.filter(value);
      });

      // Scales
      const xScale = d3
        .scaleLog()
        .domain(d3.extent(filteredData, currentConfig.accessor))
        .range([0, width]);

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(filteredData, (d) => d.medalScore)])
        .range([height, 0]);

      // X-axis
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll("text")
        .style("text-anchor", "middle");

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text(currentConfig.label);

      // Y-axis
      svg.append("g").call(d3.axisLeft(yScale));

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Medal Score");

      // Add regression line legend
      const democraticLegendItem = legendContainer
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px");

      democraticLegendItem
        .append("svg")
        .attr("width", 30)
        .attr("height", 20)
        .style("position", "absolute")
        .style("left", "260px")
        .style("top", "110px")
        .append("line")
        .attr("x1", 0)
        .attr("y1", 10)
        .attr("x2", 30)
        .attr("y2", 10)
        .attr("stroke", "#6fa2ff")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

      democraticLegendItem
        .append("span")
        .style("position", "absolute")
        .style("left", "290px")
        .style("top", "100px")
        .style("margin-left", "10px")
        .text("Democratic Country")
        .style("color", "#6fa2ff")
        .style("font-size", "13px");

      const authoritarianLegendItem = legendContainer
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px");

      authoritarianLegendItem
        .append("svg")
        .attr("width", 30)
        .attr("height", 20)
        .style("position", "absolute")
        .style("left", "260px")
        .style("top", "160px")
        .append("line")
        .attr("x1", 0)
        .attr("y1", 10)
        .attr("x2", 30)
        .attr("y2", 10)
        .attr("stroke", "#fb6f92")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

      authoritarianLegendItem
        .append("span")
        .style("position", "absolute")
        .style("left", "290px")
        .style("top", "150px")
        .style("margin-left", "10px")
        .text("Authoritarian Country")
        .style("color", "#fb6f92")
        .style("font-size", "13px");

      const medalinstruction = legendContainer.append("div");

      medalinstruction
        .append("span")
        .style("position", "absolute")
        .style("left", "-540px")
        .style("top", "600px")
        .style("margin-top", "20px")
        .style("display", "block")
        .text("Medal score = Gold x 0.6 + Silver x 0.3 + Bronze x 0.1")
        .style("color", "#a0a0a0")
        .style("font-size", "12px");

      // Animation for scatter plot reveal
      function animatePoints() {
        // Create initial points in the center
        const points = svg
          .selectAll(".dot")
          .data(filteredData, (d) => d.country)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("r", 8)
          .attr("cx", width / 2) // Start at center x
          .attr("cy", (d) => yScale(d.medalScore)) // Maintain y-axis position
          .attr("fill", (d) =>
            d.democraticStatus === "democratic" ? "#a2d2ff" : "#ffafcc"
          )
          .attr("opacity", 0.7);

        // Add event listeners to points
        points
          .on("mouseover", function (event, d) {
            d3.select(this).attr("r", 10);
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
              .html(
                `
                  <strong>${d.country}</strong><br>
                  🥇 ${d.gold} 🥈 ${d.silver} 🥉 ${d.bronze}<br>
                  ${currentConfig.label}: ${currentConfig
                  .accessor(d)
                  .toLocaleString()}<br>
                `
              )
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseout", function () {
            d3.select(this).attr("r", 8);
            tooltip.transition().duration(500).style("opacity", 0);
          });

        // Animate points to their final positions
        points
          .transition()
          .duration(4000)
          .attr("cx", (d) => xScale(currentConfig.accessor(d)));

        // Add regression lines after points have moved
        setTimeout(addRegressionLines, 3500);
      }

      // Function to add regression lines
      function addRegressionLines() {
        const democraticData = filteredData.filter(
          (d) => d.democraticStatus === "democratic"
        );
        const authoritarianData = filteredData.filter(
          (d) => d.democraticStatus === "authoritarian"
        );

        // Polynomial regression function
        function polynomialRegression(data, xAccessor, yAccessor, degree = 2) {
          // Prepare the data
          const X = data.map(xAccessor);
          const Y = data.map(yAccessor);
          const n = X.length;

          // Create design matrix
          function designMatrix(X, degree) {
            return X.map((x) =>
              Array.from({ length: degree + 1 }, (_, i) => Math.pow(x, i))
            );
          }

          // Matrix transpose
          function transpose(matrix) {
            return matrix[0].map((_, colIndex) =>
              matrix.map((row) => row[colIndex])
            );
          }

          // Matrix multiplication
          function matrixMultiply(a, b) {
            const result = [];
            for (let i = 0; i < a.length; i++) {
              result[i] = [];
              for (let j = 0; j < b[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < a[0].length; k++) {
                  sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
              }
            }
            return result;
          }

          // Matrix inversion (simple for small matrices)
          function invertMatrix(matrix) {
            const a = matrix[0][0],
              b = matrix[0][1],
              c = matrix[1][0],
              d = matrix[1][1];
            const det = a * d - b * c;
            return [
              [d / det, -b / det],
              [-c / det, a / det],
            ];
          }

          // Solve using normal equation
          const phi = designMatrix(X, degree);
          const phiTranspose = transpose(phi);
          const phiTPhi = matrixMultiply(phiTranspose, phi);
          const phiTY = matrixMultiply(
            phiTranspose,
            Y.map((y) => [y])
          );

          // For simplicity, we'll use a 2x2 matrix inversion (works for degree 2)
          const coefficients = matrixMultiply(
            invertMatrix(phiTPhi.slice(0, 2).map((row) => row.slice(0, 2))),
            phiTY.slice(0, 2)
          ).flat();

          return {
            coefficients: coefficients,
            predict: function (x) {
              return coefficients.reduce(
                (sum, coeff, power) => sum + coeff * Math.pow(x, power),
                0
              );
            },
          };
        }

        // Function to draw regression line with animation
        function drawAnimatedRegressionLine(data, color) {
          if (data.length === 0) return;

          const regression = polynomialRegression(
            data,
            currentConfig.accessor,
            (d) => d.medalScore,
            2
          );

          const xValues = data.map(currentConfig.accessor);
          const xMin = d3.min(xValues);
          const xMax = d3.max(xValues);
          const numPoints = 100;
          const step = (xMax - xMin) / numPoints;

          const regressionPoints = Array.from({ length: numPoints }, (_, i) => {
            const x = xMin + i * step;
            return {
              x: x,
              y: regression.predict(x),
            };
          });

          const line = d3
            .line()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y));

          const path = svg
            .append("path")
            .datum(regressionPoints)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("d", line);

          // Animate line drawing
          const totalLength = path.node().getTotalLength();
          path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2500)
            .attr("stroke-dashoffset", 0);
        }

        // Draw regression lines
        drawAnimatedRegressionLine(democraticData, "#6fa2ff");
        drawAnimatedRegressionLine(authoritarianData, "#fb6f92");
      }

      // Kick off the animation
      animatePoints();
    }

    // Add x-axis select change handler
    d3.select("#x-axis-select").on("change", function () {
      animateScatterPlot(this.value);
    });

    // Initial render
    animateScatterPlot("gdp");
  });
});
